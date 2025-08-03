from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from .. import db
from ..services.encrypt import verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(payload: LoginRequest, request: Request):
    user = db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user_id"] = str(user["_id"])
    return {"message": "Logged in"}


@router.post("/logout")
def logout(request: Request):
    request.session.pop("user_id", None)
    return {"message": "Logged out"}

