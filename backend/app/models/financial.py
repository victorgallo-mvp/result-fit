from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date

TxType = Literal["income", "expense"]


class FinancialCreate(BaseModel):
    type: TxType
    category: str
    amount: float
    date: date
    description: str
    # > 1 = lançamento a prazo: `amount` é o total, dividido em N parcelas mensais
    parcelas: int = Field(default=1, ge=1, le=60)


class FinancialUpdate(BaseModel):
    type: Optional[TxType] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    description: Optional[str] = None


class RecurringCreate(BaseModel):
    type: TxType
    category: str
    amount: float
    description: str
    # dia do mês em que o lançamento cai (ajustado pra meses curtos)
    day_of_month: int = Field(ge=1, le=31)
    # primeiro mês em que passa a valer (o dia é ignorado, vale day_of_month)
    start_date: date
    end_date: Optional[date] = None


class RecurringUpdate(BaseModel):
    type: Optional[TxType] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    end_date: Optional[date] = None
    active: Optional[bool] = None
