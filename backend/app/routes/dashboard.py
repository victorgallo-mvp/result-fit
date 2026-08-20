from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services import dashboard_service

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def get_dashboard():
    return await dashboard_service.get_dashboard()
