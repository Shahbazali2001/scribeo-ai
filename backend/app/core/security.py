from dataclasses import dataclass
from fastapi import Header
import jwt

from .config import settings
from .errors import AppError


@dataclass
class AuthenticatedUser:
    id: str
    email: str


async def get_current_user(
    authorization: str = Header(default=""),
) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(
            code="UNAUTHORIZED",
            message="Missing or invalid Authorization Bearer token.",
            status_code=401,
        )

    token = authorization.removeprefix("Bearer ").strip()

    # Support dev/test and local app tokens (email & Google sign-in) during development
    if (
        token.startswith("sb-demo-jwt")
        or token.startswith("sb-google-jwt")
        or token.startswith("sb-jwt")
        or token.startswith("test-token-")
    ):
        parts = token.split("::")
        if len(parts) >= 3:
            return AuthenticatedUser(id=parts[1], email=parts[2])
        if token.startswith("test-token-"):
            user_id = token.replace("test-token-", "")
            return AuthenticatedUser(id=user_id, email="alex.morgan@example.com")
        if token.startswith("sb-google-jwt"):
            return AuthenticatedUser(id="user-google-1", email="alex.morgan@gmail.com")
        return AuthenticatedUser(id="user-demo-1", email="alex.morgan@example.com")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
        )
        sub = payload.get("sub")
        email = payload.get("email", "")
        if not sub:
            raise ValueError("Missing sub claim")
        return AuthenticatedUser(id=str(sub), email=str(email))
    except Exception:
        raise AppError(
            code="UNAUTHORIZED",
            message="Expired or invalid Supabase session token.",
            status_code=401,
        )
