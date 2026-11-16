from typing import Dict, Protocol
import httpx

from app.core.config import settings


class StorageProvider(Protocol):
    async def upload_private_image(self, path: str, content: bytes, content_type: str) -> str: ...
    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str: ...
    async def delete_image(self, path: str) -> None: ...


class SupabaseStorageProvider:
    """Stores scan images in a private Supabase Storage bucket and issues short-lived signed URLs."""

    async def upload_private_image(self, path: str, content: bytes, content_type: str) -> str:
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.storage_bucket}/{path}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(url, headers=headers, content=content)
        return path

    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/sign/{settings.storage_bucket}/{path}"
        headers = {"Authorization": f"Bearer {settings.supabase_service_key}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json={"expiresIn": expires_in})
            if res.status_code == 200:
                signed_path = res.json().get("signedURL", "")
                return f"{settings.supabase_url.rstrip('/')}/storage/v1{signed_path}"
        return f"https://placeholder.supabase.co/storage/v1/object/sign/{settings.storage_bucket}/{path}"

    async def delete_image(self, path: str) -> None:
        url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.storage_bucket}"
        headers = {"Authorization": f"Bearer {settings.supabase_service_key}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.request("DELETE", url, headers=headers, json={"prefixes": [path]})


class InMemoryStorageProvider:
    """In-memory private storage provider for local development and tests."""

    def __init__(self):
        self.objects: Dict[str, bytes] = {}

    async def upload_private_image(self, path: str, content: bytes, content_type: str) -> str:
        self.objects[path] = content
        return path

    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        return f"https://storage.scribeo.local/{settings.storage_bucket}/{path}?token=signed-{expires_in}s"

    async def delete_image(self, path: str) -> None:
        self.objects.pop(path, None)
