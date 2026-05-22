from pydantic import BaseModel


class PlanCreate(BaseModel):
    name: str
    price: float
    frequency_per_week: int


class PlanUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    frequency_per_week: int | None = None
    active: bool | None = None
