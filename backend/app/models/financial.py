from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date


class FinancialCreate(BaseModel):
    type: Literal["income", "expense"]
    category: str
    amount: float
    date: date
    description: str


class FinancialUpdate(BaseModel):
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    description: Optional[str] = None
