from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date


class PaymentCreate(BaseModel):
    student_id: str
    amount: float
    due_date: date
    notes: str = ""


class PaymentMarkPaid(BaseModel):
    paid_at: date
    payment_method: Literal["pix", "dinheiro", "cartao", "transferencia"]


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    due_date: Optional[date] = None
    paid_at: Optional[date] = None
    payment_method: Optional[Literal["pix", "dinheiro", "cartao", "transferencia"]] = None
    status: Optional[Literal["pending", "paid", "overdue"]] = None
    notes: Optional[str] = None
