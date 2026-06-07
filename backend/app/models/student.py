from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import date


TRAINING_DAYS = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


class StudentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    training_days: list[TRAINING_DAYS] = []
    plan_id: str
    due_day: int
    notes: str = ""
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    training_days: Optional[list[TRAINING_DAYS]] = None
    plan_id: Optional[str] = None
    due_day: Optional[int] = None
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
