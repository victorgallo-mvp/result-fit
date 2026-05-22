from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(user=Depends(get_current_user)):
    tid, uid = str(user["tenant_id"]), str(user["_id"])
    return await dashboard_service.get_summary(tid, uid)
