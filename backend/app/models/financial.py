from __future__ import annotations
from pydantic import BaseModel
from typing import Literal
from datetime import date


class FinancialCreate(BaseModel):
    type: Literal["income", "expense"]
    category: str
    amount: float
    date: date
    description: str


class FinancialUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    category: str | None = None
    amount: float | None = None
    date: date | None = None
    description: str | None = None
