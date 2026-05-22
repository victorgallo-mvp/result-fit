from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["personal", "admin"] = "personal"
    shift: Literal["morning", "afternoon", "full"] = "morning"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    shift: Literal["morning", "afternoon", "full"] | None = None
    password: str | None = None


class UserOut(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: str
    shift: str
    active: bool
    created_at: datetime
