from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.models.attendance import AttendanceMark, AttendanceDelete
from app.services import attendance_service

router = APIRouter(prefix="/attendances", tags=["attendances"])


@router.post("/mark", status_code=201)
async def mark(data: AttendanceMark, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await attendance_service.mark_attendance(data.student_id, data.date, tid, uid)


@router.delete("")
async def unmark(data: AttendanceDelete, user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    await attendance_service.unmark_attendance(data.student_id, data.date, tid, uid)
    return {"detail": "Presença removida"}


@router.get("/today")
async def today(user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await attendance_service.get_today_list(tid, uid)
