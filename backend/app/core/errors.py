from typing import Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        reset_at: Optional[str] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.reset_at = reset_at
        super().__init__(message)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    payload = {"error": {"code": exc.code, "message": exc.message}}
    if exc.reset_at:
        payload["error"]["reset_at"] = exc.reset_at
    return JSONResponse(status_code=exc.status_code, content=payload)
