from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.models.plan import PlanCreate, PlanUpdate
from app.services import plan_service

router = APIRouter(
    prefix="/plans",
    tags=["plans"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def list_plans():
    return await plan_service.list_plans()


@router.post("", status_code=201)
async def create_plan(data: PlanCreate):
    return await plan_service.create_plan(data)


@router.put("/{plan_id}")
async def update_plan(plan_id: str, data: PlanUpdate):
    return await plan_service.update_plan(plan_id, data)


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: str):
    await plan_service.delete_plan(plan_id)
