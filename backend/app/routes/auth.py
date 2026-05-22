from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserUpdate
from app.auth.dependencies import get_current_user, require_admin
from app.services import auth_service
from app.models.common import serialize_doc
from app.database import get_db
from app.auth.jwt_handler import hash_password
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    return await auth_service.login(form.username, form.password)


@router.post("/register", status_code=201)
async def register(data: UserCreate, admin=Depends(require_admin)):
    tenant_id = str(admin["tenant_id"])
    return await auth_service.register(data, tenant_id)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return serialize_doc(current_user)


@router.put("/me")
async def update_me(data: UserUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    updates = data.model_dump(exclude_none=True)
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
    user = await db.users.find_one({"_id": current_user["_id"]})
    return serialize_doc(user)
