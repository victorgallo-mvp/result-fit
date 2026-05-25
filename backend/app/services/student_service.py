import calendar
from datetime import datetime, timezone, date
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_db
from app.models.student import StudentCreate, StudentUpdate
from app.models.common import serialize_doc


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

    student_ids = [s["_id"] for s in students]

    plan_ids = list({s["plan_id"] for s in students if s.get("plan_id")})
    plans = {}
    if plan_ids:
        async for p in db.plans.find({"_id": {"$in": plan_ids}}):
            plans[p["_id"]] = p

    # próximo pagamento pendente/vencido por aluno — 1 query via aggregation
    payment_map = {}
    if student_ids:
        pipeline = [
            {"$match": {"student_id": {"$in": student_ids}, "status": {"$in": ["pending", "overdue"]}}},
            {"$sort": {"due_date": 1}},
            {"$group": {
                "_id": "$student_id",
                "payment_id": {"$first": "$_id"},
                "due_date":   {"$first": "$due_date"},
                "amount":     {"$first": "$amount"},
                "status":     {"$first": "$status"},
            }},
        ]
        async for p in db.payments.aggregate(pipeline):
            due = p["due_date"]
            payment_map[p["_id"]] = {
                "id":       str(p["payment_id"]),
                "due_date": due.strftime("%Y-%m-%d") if hasattr(due, "strftime") else str(due)[:10],
                "amount":   p["amount"],
                "status":   p["status"],
            }

    result = []
    for s in students:
        doc = serialize_doc(s)
        doc["plan"] = serialize_doc(plans.get(s.get("plan_id")))
        doc["next_payment"] = payment_map.get(s["_id"])
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
            "$gte": date(today.year, 1, 1),
            "$lte": today,
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
    result = await db.students.insert_one(doc)
    student_id = result.inserted_id
    doc["_id"] = student_id

    if data.last_payment_date:
        lpd = data.last_payment_date
        paid_dt = datetime.combine(lpd, datetime.min.time())

        # next occurrence of due_day after last_payment_date
        dd = data.due_day
        if lpd.day < dd:
            next_year, next_month = lpd.year, lpd.month
        else:
            next_month = lpd.month + 1
            next_year = lpd.year + next_month // 13
            next_month = next_month if next_month <= 12 else 1
        max_day = calendar.monthrange(next_year, next_month)[1]
        next_due = date(next_year, next_month, min(dd, max_day))
        next_status = "overdue" if next_due < date.today() else "pending"
        next_dt = datetime.combine(next_due, datetime.min.time())

        await db.payments.insert_many([
            {
                "tenant_id": ObjectId(tenant_id),
                "student_id": student_id,
                "amount": plan["price"],
                "due_date": paid_dt,
                "status": "paid",
                "paid_at": paid_dt,
                "payment_method": None,
                "notes": "Pagamento inicial",
                "created_at": datetime.now(timezone.utc),
            },
            {
                "tenant_id": ObjectId(tenant_id),
                "student_id": student_id,
                "amount": plan["price"],
                "due_date": next_dt,
                "status": next_status,
                "paid_at": None,
                "payment_method": None,
                "notes": "",
                "created_at": datetime.now(timezone.utc),
            },
        ])

    return serialize_doc(doc)


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
