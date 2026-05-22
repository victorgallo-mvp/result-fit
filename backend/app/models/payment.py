from pydantic import BaseModel
from typing import Literal
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
    amount: float | None = None
    due_date: date | None = None
    paid_at: date | None = None
    payment_method: Literal["pix", "dinheiro", "cartao", "transferencia"] | None = None
    status: Literal["pending", "paid", "overdue"] | None = None
    notes: str | None = None
