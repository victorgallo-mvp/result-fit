from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from app.database import get_db
from app.models.plan import PlanCreate, PlanUpdate
from app.models.common import serialize_doc


async def list_plans(tenant_id: str) -> list:
    db = get_db()
    docs = await db.plans.find({"tenant_id": ObjectId(tenant_id)}).sort("name", 1).to_list(length=100)
    return [serialize_doc(d) for d in docs]


async def create_plan(data: PlanCreate, tenant_id: str) -> dict:
    db = get_db()
    doc = {
        "tenant_id": ObjectId(tenant_id),
        "name": data.name,
        "price": data.price,
        "frequency_per_week": data.frequency_per_week,
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def update_plan(plan_id: str, data: PlanUpdate, tenant_id: str) -> dict:
    db = get_db()
    updates = data.model_dump(exclude_none=True)
    result = await db.plans.update_one(
        {"_id": ObjectId(plan_id), "tenant_id": ObjectId(tenant_id)},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    doc = await db.plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(doc)


async def delete_plan(plan_id: str, tenant_id: str):
    db = get_db()
    in_use = await db.students.count_documents({
        "plan_id": ObjectId(plan_id),
        "status": "active",
    })
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Plano em uso por alunos ativos")
    result = await db.plans.delete_one({"_id": ObjectId(plan_id), "tenant_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
