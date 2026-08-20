from datetime import datetime, timezone, date
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


async def list_payments(status_filter: str | None, due_until: date | None) -> list:
    db = get_db()
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if due_until:
        query["due_date"] = {"$lte": datetime.combine(due_until, datetime.min.time())}

    docs = await db.payments.find(query).sort("due_date", -1).to_list(length=1000)

    student_ids = list({d["student_id"] for d in docs if d.get("student_id")})
    student_map = {}
    if student_ids:
        async for s in db.students.find({"_id": {"$in": student_ids}}, {"name": 1, "phone": 1}):
            student_map[s["_id"]] = s

    result = []
    for d in docs:
        doc = serialize_doc(d)
        s = student_map.get(d.get("student_id"))
        doc["student_name"] = s["name"] if s else None
        result.append(doc)
    return result


async def create_payment(data: PaymentCreate) -> dict:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(data.student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    due_dt = datetime.combine(data.due_date, datetime.min.time())
    doc = {
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


async def mark_paid(payment_id: str, data: PaymentMarkPaid) -> dict:
    db = get_db()
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    paid_dt = datetime.combine(data.paid_at, datetime.min.time())
    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"paid_at": paid_dt, "payment_method": data.payment_method, "status": "paid"}},
    )
    doc = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return serialize_doc(doc)


async def get_student_payments(student_id: str) -> list:
    db = get_db()
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    docs = await db.payments.find({"student_id": ObjectId(student_id)}).sort("due_date", -1).to_list(length=200)
    return [serialize_doc(d) for d in docs]


async def update_payment(payment_id: str, data: PaymentUpdate) -> dict:
    db = get_db()
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    updates = data.model_dump(exclude_none=True)
    if "due_date" in updates:
        updates["due_date"] = datetime.combine(updates["due_date"], datetime.min.time())
    if "paid_at" in updates:
        updates["paid_at"] = datetime.combine(updates["paid_at"], datetime.min.time())

    await db.payments.update_one({"_id": ObjectId(payment_id)}, {"$set": updates})
    doc = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return serialize_doc(doc)


async def delete_payment(payment_id: str):
    db = get_db()
    result = await db.payments.delete_one({"_id": ObjectId(payment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
