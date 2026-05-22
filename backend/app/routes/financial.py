from fastapi import APIRouter, Depends, Query
from datetime import date
from app.auth.dependencies import get_current_user
from app.models.financial import FinancialCreate, FinancialUpdate
from app.services import financial_service

router = APIRouter(prefix="/financial", tags=["financial"])


@router.get("")
async def list_transactions(
    month: str = Query(..., description="YYYY-MM"),
    user=Depends(get_current_user),
):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    year, m = int(month[:4]), int(month[5:7])
    return await financial_service.list_transactions(tid, uid, year, m)


@router.post("", status_code=201)
async def create_transaction(data: FinancialCreate, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await financial_service.create_transaction(data, tid, uid)


@router.put("/{tx_id}")
async def update_transaction(tx_id: str, data: FinancialUpdate, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await financial_service.update_transaction(tx_id, data, tid, uid)


@router.delete("/{tx_id}", status_code=204)
async def delete_transaction(tx_id: str, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    await financial_service.delete_transaction(tx_id, tid, uid)
