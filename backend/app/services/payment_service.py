from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.payment import PaymentCreate, PaymentMarkPaid, PaymentUpdate
from app.models.common import serialize_doc


def _compute_status(due_date: date, paid_at: date | None) -> str:
    if paid_at:
        return "paid"
    if due_date < date.today():
        return "overdue"
    return "pending"


async def list_payments(tenant_id: str, user_id: str, status_filter: str | None, due_until: date | None) -> list:
    db = get_db()
    student_ids = [
        s["_id"] async for s in db.students.find(
            {"tenant_id": ObjectId(tenant_id), "assigned_to": ObjectId(user_id)},
            {"_id": 1},
        )
    ]
    query: dict = {"tenant_id": ObjectId(tenant_id), "student_id": {"$in": student_ids}}
    if status_filter:
        query["status"] = status_filter
    if due_until:
        query["due_date"] = {"$lte": datetime.combine(due_until, datetime.min.time())}

    docs = await db.payments.find(query).sort("due_date", -1).to_list(length=1000)

    student_map = {}
    for sid in student_ids:
        s = await db.students.find_one({"_id": sid}, {"name": 1, "phone": 1})
        if s:
            student_map[sid] = s

    result = []
    for d in docs:
        doc = serialize_doc(d)
        s = student_map.get(d["student_id"])
        doc["student_name"] = s["name"] if s else None
        result.append(doc)
    return result


async def create_payment(data: PaymentCreate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(data.student_id),
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    due_dt = datetime.combine(data.due_date, datetime.min.time())
    doc = {
        "tenant_id": ObjectId(tenant_id),
        "student_id": ObjectId(data.student_id),
        "amount": data.amount,
        "due_date": due_dt,
        "paid_at": None,
        "payment_method": None,
        "status": _compute_status(data.due_date, None),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.payments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def mark_paid(payment_id: str, data: PaymentMarkPaid, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    payment = await db.payments.find_one({
        "_id": ObjectId(payment_id),
        "tenant_id": ObjectId(tenant_id),
    })
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    student = await db.students.find_one({
        "_id": payment["student_id"],
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=403, detail="Acesso negado")

    paid_dt = datetime.combine(data.paid_at, datetime.min.time())
    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"paid_at": paid_dt, "payment_method": data.payment_method, "status": "paid"}},
    )
    doc = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return serialize_doc(doc)


async def get_student_payments(student_id: str, tenant_id: str, user_id: str) -> list:
    db = get_db()
    student = await db.students.find_one({
        "_id": ObjectId(student_id),
        "tenant_id": ObjectId(tenant_id),
        "assigned_to": ObjectId(user_id),
    })
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    docs = await db.payments.find({"student_id": ObjectId(student_id)}).sort("due_date", -1).to_list(length=200)
    return [serialize_doc(d) for d in docs]


async def get_dashboard_payments(tenant_id: str, user_id: str) -> dict:
    db = get_db()
    student_ids = [
        s["_id"] async for s in db.students.find(
            {"tenant_id": ObjectId(tenant_id), "assigned_to": ObjectId(user_id), "status": "active"},
            {"_id": 1},
        )
    ]

    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)
    first_month = datetime.combine(date(today.year, today.month, 1), datetime.min.time())
    last_month = datetime.combine(today, datetime.max.time())

    today_dt = datetime.combine(today, datetime.min.time())
    in_7_days_dt = datetime.combine(in_7_days, datetime.min.time())
    in_8_days_dt = datetime.combine(today + timedelta(days=8), datetime.min.time())
    in_30_days_dt = datetime.combine(in_30_days, datetime.min.time())

    async def enrich(docs):
        result = []
        for d in docs:
            doc = serialize_doc(d)
            s = await db.students.find_one({"_id": d["student_id"]}, {"name": 1})
            doc["student_name"] = s["name"] if s else None
            result.append(doc)
        return result

    vencendo = await db.payments.find({
        "student_id": {"$in": student_ids},
        "status": "pending",
        "due_date": {"$gte": today_dt, "$lte": in_7_days_dt},
    }).sort("due_date", 1).to_list(length=100)

    vencendo_breve = await db.payments.find({
        "student_id": {"$in": student_ids},
        "status": "pending",
        "due_date": {"$gte": in_8_days_dt, "$lte": in_30_days_dt},
    }).sort("due_date", 1).to_list(length=100)

    vencidas = await db.payments.find({
        "student_id": {"$in": student_ids},
        "status": {"$in": ["pending", "overdue"]},
        "due_date": {"$lt": today_dt},
    }).sort("due_date", 1).to_list(length=100)

    pagas_mes = await db.payments.find({
        "student_id": {"$in": student_ids},
        "status": "paid",
        "paid_at": {"$gte": first_month, "$lte": last_month},
    }).sort("paid_at", -1).to_list(length=100)

    return {
        "vencendo_7_dias": await enrich(vencendo),
        "vencendo_em_breve": await enrich(vencendo_breve),
        "vencidas": await enrich(vencidas),
        "pagas_mes": await enrich(pagas_mes),
    }


async def update_payment(payment_id: str, data: PaymentUpdate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    payment = await db.payments.find_one({"_id": ObjectId(payment_id), "tenant_id": ObjectId(tenant_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    student = await db.students.find_one({"_id": payment["student_id"], "assigned_to": ObjectId(user_id)})
    if not student:
        raise HTTPException(status_code=403, detail="Acesso negado")

    updates = data.model_dump(exclude_none=True)
    if "due_date" in updates:
        updates["due_date"] = datetime.combine(updates["due_date"], datetime.min.time())
    if "paid_at" in updates:
        updates["paid_at"] = datetime.combine(updates["paid_at"], datetime.min.time())

    await db.payments.update_one({"_id": ObjectId(payment_id)}, {"$set": updates})
    doc = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return serialize_doc(doc)


async def delete_payment(payment_id: str, tenant_id: str, user_id: str):
    db = get_db()
    payment = await db.payments.find_one({"_id": ObjectId(payment_id), "tenant_id": ObjectId(tenant_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    student = await db.students.find_one({"_id": payment["student_id"], "assigned_to": ObjectId(user_id)})
    if not student:
        raise HTTPException(status_code=403, detail="Acesso negado")

    await db.payments.delete_one({"_id": ObjectId(payment_id)})
