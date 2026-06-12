from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.models.student import StudentCreate, StudentUpdate
from app.services import student_service, attendance_service, payment_service

router = APIRouter(prefix="/students", tags=["students"])


def _ctx(user):
    return str(user["tenant_id"]), str(user["_id"])


@router.get("")
async def list_students(
    status: str | None = Query(None),
    search: str | None = Query(None),
    user=Depends(get_current_user),
):
    tid, uid = _ctx(user)
    return await student_service.list_students(tid, uid, status, search)


@router.post("", status_code=201)
async def create_student(data: StudentCreate, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.create_student(data, tid, uid)


@router.get("/birthdays")
async def get_birthdays(user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.get_birthdays(tid, uid)


@router.get("/birthdays/month")
async def get_birthdays_month(
    month: str = Query(..., description="YYYY-MM"),
    user=Depends(get_current_user),
):
    tid, uid = _ctx(user)
    year, m = int(month[:4]), int(month[5:7])
    return await student_service.get_birthdays_month(tid, uid, year, m)


@router.post("/{student_id}/pagar")
async def pagar_student(student_id: str, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.pagar_student(student_id, tid, uid)


@router.post("/{student_id}/avaliar")
async def avaliar_student(student_id: str, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.avaliar_student(student_id, tid, uid)


@router.get("/{student_id}")
async def get_student(student_id: str, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.get_student(student_id, tid, uid)


@router.put("/{student_id}")
async def update_student(student_id: str, data: StudentUpdate, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await student_service.update_student(student_id, data, tid, uid)


@router.delete("/{student_id}", status_code=204)
async def delete_student(student_id: str, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    await student_service.delete_student(student_id, tid, uid)


@router.get("/{student_id}/payments")
async def get_student_payments(student_id: str, user=Depends(get_current_user)):
    tid, uid = _ctx(user)
    return await payment_service.get_student_payments(student_id, tid, uid)


@router.get("/{student_id}/attendances")
async def get_student_attendances(
    student_id: str,
    month: str = Query(..., description="YYYY-MM"),
    user=Depends(get_current_user),
):
    tid, uid = _ctx(user)
    year, m = int(month[:4]), int(month[5:7])
    return await attendance_service.get_student_attendances_month(student_id, tid, uid, year, m)


@router.get("/{student_id}/attendance-stats")
async def get_attendance_stats(
    student_id: str,
    month: str = Query(..., description="YYYY-MM"),
    user=Depends(get_current_user),
):
    tid, uid = _ctx(user)
    year, m = int(month[:4]), int(month[5:7])
    return await attendance_service.get_attendance_stats(student_id, tid, uid, year, m)
