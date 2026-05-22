from pydantic import BaseModel
from typing import Optional


class PlanCreate(BaseModel):
    name: str
    price: float
    frequency_per_week: int


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    frequency_per_week: Optional[int] = None
    active: Optional[bool] = None
