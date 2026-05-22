from __future__ import annotations
from pydantic import BaseModel
from datetime import date


class AttendanceMark(BaseModel):
    student_id: str
    date: date


class AttendanceDelete(BaseModel):
    student_id: str
    date: date
