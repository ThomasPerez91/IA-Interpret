from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from .. import db
from ..enums.role_enum import Role

router = APIRouter(prefix="/users", tags=["users"])


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: str
    role: Role
    created_at: datetime
    updated_at: datetime


def _user_helper(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )


@router.post("/", response_model=UserOut)
def create_user(user: UserCreate):
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.utcnow()
    role = Role.ADMIN.value if db.users.count_documents({}) == 0 else Role.USER.value
    user_dict = user.dict()
    user_dict.update({"role": role, "created_at": now, "updated_at": now})
    result = db.users.insert_one(user_dict)
    created_user = db.users.find_one({"_id": result.inserted_id})
    return _user_helper(created_user)


@router.get("/", response_model=List[UserOut])
def list_users():
    users = [
        _user_helper(u)
        for u in db.users.find()
    ]
    return users


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_helper(user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, user_update: UserUpdate):
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in user_update.dict(exclude_unset=True).items()}
    if "email" in update_data:
        existing = db.users.find_one({"email": update_data["email"], "_id": {"$ne": ObjectId(user_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    update_data["updated_at"] = datetime.utcnow()
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    return _user_helper(updated_user)


@router.delete("/{user_id}")
def delete_user(user_id: str):
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
