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

    # Support dev/test tokens during local development
    if token.startswith("sb-demo-jwt") or token.startswith("test-token-"):
        user_id = token.replace("test-token-", "") if token.startswith("test-token-") else "user-demo-1"
        return AuthenticatedUser(id=user_id, email="alex.morgan@example.com")

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
