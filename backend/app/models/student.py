from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import date


TRAINING_DAYS = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


class StudentCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None
    birthday: date | None = None
    training_days: list[TRAINING_DAYS] = []
    plan_id: str
    due_day: int
    notes: str = ""
    photo_url: str | None = None


class StudentUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    birthday: date | None = None
    training_days: list[TRAINING_DAYS] | None = None
    plan_id: str | None = None
    due_day: int | None = None
    status: Literal["active", "inactive"] | None = None
    notes: str | None = None
    photo_url: str | None = None
