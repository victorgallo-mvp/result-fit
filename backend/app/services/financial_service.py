from datetime import datetime, timezone, date
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.financial import FinancialCreate, FinancialUpdate
from app.models.common import serialize_doc


async def list_transactions(tenant_id: str, user_id: str, year: int, month: int) -> dict:
    db = get_db()
    import calendar
    first = datetime(year, month, 1)
    last = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)

    docs = await db.financial_transactions.find({
        "tenant_id": ObjectId(tenant_id),
        "user_id": ObjectId(user_id),
        "date": {"$gte": first, "$lte": last},
    }).sort("date", -1).to_list(length=500)

    income = sum(d["amount"] for d in docs if d["type"] == "income")
    expense = sum(d["amount"] for d in docs if d["type"] == "expense")

    return {
        "transactions": [serialize_doc(d) for d in docs],
        "income": income,
        "expense": expense,
        "balance": income - expense,
    }


async def create_transaction(data: FinancialCreate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    doc = {
        "tenant_id": ObjectId(tenant_id),
        "user_id": ObjectId(user_id),
        "type": data.type,
        "category": data.category,
        "amount": data.amount,
        "date": datetime.combine(data.date, datetime.min.time()),
        "description": data.description,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.financial_transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def update_transaction(tx_id: str, data: FinancialUpdate, tenant_id: str, user_id: str) -> dict:
    db = get_db()
    tx = await db.financial_transactions.find_one({
        "_id": ObjectId(tx_id),
        "tenant_id": ObjectId(tenant_id),
        "user_id": ObjectId(user_id),
    })
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    updates = data.model_dump(exclude_none=True)
    if "date" in updates:
        updates["date"] = datetime.combine(updates["date"], datetime.min.time())

    await db.financial_transactions.update_one({"_id": ObjectId(tx_id)}, {"$set": updates})
    doc = await db.financial_transactions.find_one({"_id": ObjectId(tx_id)})
    return serialize_doc(doc)


async def delete_transaction(tx_id: str, tenant_id: str, user_id: str):
    db = get_db()
    result = await db.financial_transactions.delete_one({
        "_id": ObjectId(tx_id),
        "tenant_id": ObjectId(tenant_id),
        "user_id": ObjectId(user_id),
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
