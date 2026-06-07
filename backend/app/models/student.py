from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import date


class StudentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    weekly_frequency: int = 3
    plan_id: str
    notes: str = ""
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[date] = None
    weekly_frequency: Optional[int] = None
    plan_id: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    ultimo_pagamento: Optional[date] = None
