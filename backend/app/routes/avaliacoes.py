from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services import avaliacoes_service

router = APIRouter(
    prefix="/avaliacoes",
    tags=["avaliacoes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def get_avaliacoes():
    return await avaliacoes_service.get_avaliacoes()
