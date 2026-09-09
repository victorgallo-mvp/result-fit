from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.models.financial import FinancialCreate, FinancialUpdate, RecurringCreate, RecurringUpdate
from app.services import financial_service

router = APIRouter(
    prefix="/financial",
    tags=["financial"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def list_transactions(month: str = Query(..., description="YYYY-MM")):
    year, m = int(month[:4]), int(month[5:7])
    return await financial_service.list_transactions(year, m)


@router.post("", status_code=201)
async def create_transaction(data: FinancialCreate):
    return await financial_service.create_transaction(data)


# ── recorrentes (antes de /{tx_id} pra não colidir) ──────────────────────

@router.get("/recurring")
async def list_recurring():
    return await financial_service.list_recurring()


@router.post("/recurring", status_code=201)
async def create_recurring(data: RecurringCreate):
    return await financial_service.create_recurring(data)


@router.put("/recurring/{rec_id}")
async def update_recurring(rec_id: str, data: RecurringUpdate):
    return await financial_service.update_recurring(rec_id, data)


@router.delete("/recurring/{rec_id}", status_code=204)
async def delete_recurring(rec_id: str, apagar_lancamentos: bool = Query(False)):
    await financial_service.delete_recurring(rec_id, apagar_lancamentos)


@router.put("/{tx_id}")
async def update_transaction(tx_id: str, data: FinancialUpdate):
    return await financial_service.update_transaction(tx_id, data)


@router.delete("/{tx_id}", status_code=204)
async def delete_transaction(tx_id: str, scope: str = Query("one", pattern="^(one|group)$")):
    await financial_service.delete_transaction(tx_id, scope)
