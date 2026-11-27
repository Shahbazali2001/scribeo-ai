import asyncio
from dataclasses import dataclass
from functools import lru_cache
from fastapi import Header
import jwt
from jwt import PyJWKClient

from .config import settings
from .errors import AppError

ASYMMETRIC_ALGORITHMS = frozenset({"ES256", "ES384", "RS256", "RS384", "EdDSA"})


@dataclass
class AuthenticatedUser:
    id: str
    email: str
    full_name: str = ""

    @property
    def resolved_display_name(self) -> str:
        if self.full_name.strip():
            return self.full_name.strip()
        if self.email and "@" in self.email:
            local = self.email.split("@", 1)[0]
            cleaned = " ".join(
                part.capitalize() for part in local.replace(".", " ").replace("_", " ").replace("-", " ").split()
            )
            if cleaned:
                return cleaned
        return "Scribeo User"


@lru_cache(maxsize=4)
def _get_jwk_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(
        jwks_url,
        cache_keys=True,
        cache_jwk_set=True,
        lifespan=3600,
    )


def _decode_supabase_jwt(token: str) -> dict:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")

    if alg in ASYMMETRIC_ALGORITHMS:
        jwk_client = _get_jwk_client(settings.resolved_supabase_jwks_url)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            audience=settings.supabase_jwt_audience,
            issuer=settings.resolved_supabase_jwt_issuer,
        )

    if alg == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
        )

    raise ValueError(f"Unsupported JWT algorithm: {alg}")


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

    # Support dev/test and local demo tokens when enabled
    if settings.allow_dev_tokens and (
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
        payload = await asyncio.to_thread(_decode_supabase_jwt, token)
        sub = payload.get("sub")
        email = payload.get("email", "")
        user_meta = payload.get("user_metadata") or {}
        full_name = ""
        if isinstance(user_meta, dict):
            full_name = str(user_meta.get("full_name") or user_meta.get("name") or "")
        if not sub:
            raise ValueError("Missing sub claim")
        return AuthenticatedUser(id=str(sub), email=str(email), full_name=full_name)
    except Exception:
        raise AppError(
            code="UNAUTHORIZED",
            message="Expired or invalid Supabase session token.",
            status_code=401,
        )
