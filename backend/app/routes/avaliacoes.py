from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services import avaliacoes_service

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


@router.get("")
async def get_avaliacoes(user=Depends(get_current_user)):
    tid = str(user["tenant_id"])
    uid = str(user["_id"])
    return await avaliacoes_service.get_avaliacoes(tid, uid)
