from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    shift: Optional[Literal["morning", "afternoon", "full"]] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    shift: str
    active: bool
    created_at: datetime
