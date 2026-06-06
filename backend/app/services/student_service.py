import calendar
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.student import StudentCreate, StudentUpdate
from app.models.common import serialize_doc


def calc_proximo(from_date: date, due_day: int) -> date:
    """Next occurrence of due_day strictly after from_date."""
    year, month = from_date.year, from_date.month
    if from_date.day < due_day:
        return date(year, month, min(due_day, calendar.monthrange(year, month)[1]))
    month = month % 12 + 1
    year = year if month > 1 else year + 1
    return date(year, month, min(due_day, calendar.monthrange(year, month)[1]))


def _student_filter(tenant_id: str, user_id: str) -> dict:
    return {
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    }


async def list_students(tenant_id: str, user_id: str, status_filter: str | None, search: str | None) -> list:
    db = get_db()
    query = _student_filter(tenant_id, user_id)
    if status_filter:
        query["status"] = status_filter
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    students = await db.students.find(query).sort("name", 1).to_list(length=500)

    plan_ids = list({s["plan_id"] for s in students if s.get("plan_id")})
    plans = {}
    if plan_ids:
        async for p in db.plans.find({"_id": {"$in": plan_ids}}):
            plans[p["_id"]] = p

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    in_3_dt = datetime.combine(today + timedelta(days=3), datetime.min.time())

    result = []
    for s in students:
        doc = serialize_doc(s)
        doc["plan"] = serialize_doc(plans.get(s.get("plan_id")))
        pp = s.get("proximo_pagamento")
        if pp:
            if pp < today_dt:
                st = "overdue"
            elif pp <= in_3_dt:
                st = "pending"
            else:
                st = "upcoming"
            plan = plans.get(s.get("plan_id"))
            doc["next_payment"] = {
                "due_date": pp.strftime("%Y-%m-%d"),
                "amount": plan.get("price", 0) if plan else 0,
                "status": st,
            }
        else:
            doc["next_payment"] = None
        result.append(doc)
    return result


async def get_student(student_id: str, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        **_student_filter(tenant_id, user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    doc = serialize_doc(student)

    plan = await db.plans.find_one({"_id": student.get("plan_id")})
    doc["plan"] = serialize_doc(plan) if plan else None

    today = date.today()
    pending = await db.payments.count_documents({
        "student_id": student["_id"],
        "status": {"$in": ["pending", "overdue"]},
    })
    paid_year = await db.payments.count_documents({
        "student_id": student["_id"],
        "status": "paid",
        "paid_at": {
            "$gte": datetime(today.year, 1, 1),
            "$lte": datetime.combine(today, datetime.max.time()),
        },
    })
    doc["payment_summary"] = {"pending_count": pending, "paid_this_year": paid_year}
    return doc


async def create_student(data: StudentCreate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    plan = await db.plans.find_one({"_id": ObjectId(data.plan_id), "tenant_id": ObjectId(tenant_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    doc = {
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "birthday": datetime.combine(data.birthday, datetime.min.time()) if data.birthday else None,
        "training_days": data.training_days,
        "plan_id": ObjectId(data.plan_id),
        "due_day": data.due_day,
        "status": "active",
        "notes": data.notes,
        "photo_url": data.photo_url,
        "created_at": datetime.now(timezone.utc),
    }
    if data.ultimo_pagamento:
        ult_dt = datetime.combine(data.ultimo_pagamento, datetime.min.time())
        prox = calc_proximo(data.ultimo_pagamento, data.due_day)
        prox_dt = datetime.combine(prox, datetime.min.time())
        doc["ultimo_pagamento"] = ult_dt
        doc["proximo_pagamento"] = prox_dt

    result = await db.students.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def pagar_student(student_id: str, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        **_student_filter(tenant_id, user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    plan = await db.plans.find_one({"_id": student.get("plan_id")})
    price = plan.get("price", 0) if plan else 0

    today = date.today()
    proximo = calc_proximo(today, student.get("due_day", 10))
    today_dt = datetime.combine(today, datetime.min.time())
    proximo_dt = datetime.combine(proximo, datetime.min.time())

    await db.students.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {"ultimo_pagamento": today_dt, "proximo_pagamento": proximo_dt}},
    )
    await db.payments.insert_one({
        "tenant_id": ObjectId(tenant_id),
        "student_id": ObjectId(student_id),
        "amount": price,
        "due_date": today_dt,
        "status": "paid",
        "paid_at": today_dt,
        "payment_method": None,
        "notes": "",
        "created_at": datetime.now(timezone.utc),
    })
    return await get_student(student_id, tenant_id, user_id)


async def update_student(student_id: str, data: StudentUpdate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        **_student_filter(tenant_id, user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    updates = data.model_dump(exclude_none=True)
    if "birthday" in updates and updates["birthday"]:
        updates["birthday"] = datetime.combine(updates["birthday"], datetime.min.time())
    if "plan_id" in updates:
        updates["plan_id"] = ObjectId(updates["plan_id"])

    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": updates})
    return await get_student(student_id, tenant_id, user_id)


async def delete_student(student_id: str, tenant_id: str, user_id: str):
    db = get_db()
    result = await db.students.update_one(
        {"_id": ObjectId(student_id), **_student_filter(tenant_id, user_id)},
        {"$set": {"status": "inactive"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")


async def get_birthdays(tenant_id: str, user_id: str) -> dict:
    db = get_db()
    today = date.today()
    tomorrow = date.today().replace(day=today.day + 1) if today.day < 28 else None

    async def fetch_for_day(d: date) -> list:
        pipeline = [
            {"$match": {
                "tenant_id": ObjectId(tenant_id),
                "assigned_to": ObjectId(user_id),
                "status": "active",
                "birthday": {"$ne": None},
            }},
            {"$addFields": {
                "birth_month": {"$month": "$birthday"},
                "birth_day": {"$dayOfMonth": "$birthday"},
            }},
            {"$match": {"birth_month": d.month, "birth_day": d.day}},
        ]
        docs = await db.students.aggregate(pipeline).to_list(length=100)
        return [serialize_doc(s) for s in docs]

    result = {"today": await fetch_for_day(today)}
    if tomorrow:
        result["tomorrow"] = await fetch_for_day(tomorrow)
    else:
        result["tomorrow"] = []
    return result


async def get_birthdays_month(tenant_id: str, user_id: str, year: int, month: int) -> list:
    db = get_db()
    pipeline = [
        {"$match": {
            "tenant_id": ObjectId(tenant_id),
            "assigned_to": ObjectId(user_id),
            "status": "active",
            "birthday": {"$ne": None},
        }},
        {"$addFields": {
            "birth_month": {"$month": "$birthday"},
            "birth_day": {"$dayOfMonth": "$birthday"},
            "birth_year": {"$year": "$birthday"},
        }},
        {"$match": {"birth_month": month}},
        {"$sort": {"birth_day": 1}},
    ]
    docs = await db.students.aggregate(pipeline).to_list(length=100)
    result = []
    for s in docs:
        doc = serialize_doc(s)
        if s.get("birthday"):
            age = year - s["birthday"].year
            doc["age_completing"] = age
        result.append(doc)
    return result
