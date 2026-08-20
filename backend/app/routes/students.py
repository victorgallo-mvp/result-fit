from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_user
from app.models.student import StudentCreate, StudentUpdate
from app.services import student_service, attendance_service, payment_service

router = APIRouter(
    prefix="/students",
    tags=["students"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def list_students(
    status: str | None = Query(None),
    search: str | None = Query(None),
):
    return await student_service.list_students(status, search)


@router.post("", status_code=201)
async def create_student(data: StudentCreate):
    return await student_service.create_student(data)


@router.get("/birthdays")
async def get_birthdays():
    return await student_service.get_birthdays()


@router.get("/birthdays/month")
async def get_birthdays_month(month: str = Query(..., description="YYYY-MM")):
    year, m = int(month[:4]), int(month[5:7])
    return await student_service.get_birthdays_month(year, m)


@router.post("/{student_id}/pagar")
async def pagar_student(student_id: str):
    return await student_service.pagar_student(student_id)


@router.post("/{student_id}/avaliar")
async def avaliar_student(student_id: str):
    return await student_service.avaliar_student(student_id)


@router.get("/{student_id}")
async def get_student(student_id: str):
    return await student_service.get_student(student_id)


@router.put("/{student_id}")
async def update_student(student_id: str, data: StudentUpdate):
    return await student_service.update_student(student_id, data)


@router.delete("/{student_id}", status_code=204)
async def delete_student(student_id: str):
    await student_service.delete_student(student_id)


@router.get("/{student_id}/payments")
async def get_student_payments(student_id: str):
    return await payment_service.get_student_payments(student_id)


@router.get("/{student_id}/attendances")
async def get_student_attendances(
    student_id: str,
    month: str = Query(..., description="YYYY-MM"),
):
    year, m = int(month[:4]), int(month[5:7])
    return await attendance_service.get_student_attendances_month(student_id, year, m)


@router.get("/{student_id}/attendance-stats")
async def get_attendance_stats(
    student_id: str,
    month: str = Query(..., description="YYYY-MM"),
):
    year, m = int(month[:4]), int(month[5:7])
    return await attendance_service.get_attendance_stats(student_id, year, m)
