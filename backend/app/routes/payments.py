from fastapi import APIRouter, Depends, Query
from datetime import date
from app.auth.dependencies import get_current_user
from app.models.payment import PaymentCreate, PaymentMarkPaid, PaymentUpdate
from app.services import payment_service

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def list_payments(
    status: str | None = Query(None),
    due_until: date | None = Query(None),
):
    return await payment_service.list_payments(status, due_until)


@router.post("", status_code=201)
async def create_payment(data: PaymentCreate):
    return await payment_service.create_payment(data)


@router.put("/{payment_id}/mark-paid")
async def mark_paid(payment_id: str, data: PaymentMarkPaid):
    return await payment_service.mark_paid(payment_id, data)


@router.put("/{payment_id}")
async def update_payment(payment_id: str, data: PaymentUpdate):
    return await payment_service.update_payment(payment_id, data)


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(payment_id: str):
    await payment_service.delete_payment(payment_id)
