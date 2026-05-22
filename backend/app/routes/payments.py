from fastapi import APIRouter, Depends, Query
from datetime import date
from app.auth.dependencies import get_current_user
from app.models.payment import PaymentCreate, PaymentMarkPaid, PaymentUpdate
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("")
async def list_payments(
    status: str | None = Query(None),
    due_until: date | None = Query(None),
    user=Depends(get_current_user),
):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await payment_service.list_payments(tid, uid, status, due_until)


@router.post("", status_code=201)
async def create_payment(data: PaymentCreate, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await payment_service.create_payment(data, tid, uid)


@router.get("/dashboard")
async def dashboard_payments(user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await payment_service.get_dashboard_payments(tid, uid)


@router.put("/{payment_id}/mark-paid")
async def mark_paid(payment_id: str, data: PaymentMarkPaid, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await payment_service.mark_paid(payment_id, data, tid, uid)


@router.put("/{payment_id}")
async def update_payment(payment_id: str, data: PaymentUpdate, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await payment_service.update_payment(payment_id, data, tid, uid)


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(payment_id: str, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    await payment_service.delete_payment(payment_id, tid, uid)
