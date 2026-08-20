from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.models.attendance import AttendanceMark, AttendanceDelete
from app.services import attendance_service

router = APIRouter(
    prefix="/attendances",
    tags=["attendances"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/mark", status_code=201)
async def mark(data: AttendanceMark):
    return await attendance_service.mark_attendance(data.student_id, data.date)


@router.delete("")
async def unmark(data: AttendanceDelete):
    await attendance_service.unmark_attendance(data.student_id, data.date)
    return {"detail": "Presença removida"}


@router.get("/today")
async def today():
    return await attendance_service.get_today_list()


@router.get("/month")
async def month_list(month: str = Query(..., description="YYYY-MM")):
    year, m = int(month[:4]), int(month[5:7])
    return await attendance_service.get_month_attendance_list(year, m)
