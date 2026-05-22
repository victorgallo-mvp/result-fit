from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from app.database import get_db
from app.auth.jwt_handler import hash_password, verify_password, create_access_token
from app.models.user import UserCreate
from app.models.common import serialize_doc


async def login(email: str, password: str) -> dict:
    db = get_db()
    user = await db.users.find_one({"email": email.lower(), "active": True})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )
    token = create_access_token({
        "sub": str(user["_id"]),
        "tenant_id": str(user["tenant_id"]),
        "role": user["role"],
    })
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user)}


async def register(data: UserCreate, tenant_id: str) -> dict:
    db = get_db()
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já cadastrado",
        )
    doc = {
        "tenant_id": ObjectId(tenant_id),
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "role": data.role,
        "shift": data.shift,
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)
