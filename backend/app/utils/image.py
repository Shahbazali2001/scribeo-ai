import io
from typing import Tuple
from PIL import Image, UnidentifiedImageError

from app.core.errors import AppError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MIN_DIMENSION = 120


def validate_uploaded_image(raw_bytes: bytes) -> Tuple[int, int, str]:
    """Validates image format and minimum dimensions. Returns (width, height, content_type)."""
    if not raw_bytes:
        raise AppError(code="UNSUPPORTED_FORMAT", message="Uploaded file is empty.", status_code=400)

    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.verify()
        img = Image.open(io.BytesIO(raw_bytes))
        fmt = (img.format or "").upper()
    except (UnidentifiedImageError, OSError):
        raise AppError(
            code="UNSUPPORTED_FORMAT",
            message="Unsupported image format. Please upload a JPEG, PNG, or WebP photo.",
            status_code=400,
        )

    if fmt not in ALLOWED_FORMATS:
        raise AppError(
            code="UNSUPPORTED_FORMAT",
            message="Unsupported image format. Please upload a JPEG, PNG, or WebP photo.",
            status_code=400,
        )

    w, h = img.size
    if w < MIN_DIMENSION or h < MIN_DIMENSION:
        raise AppError(
            code="IMAGE_TOO_SMALL",
            message=f"Image is too small ({w}x{h}px). Minimum size is {MIN_DIMENSION}x{MIN_DIMENSION}px.",
            status_code=400,
        )

    content_type = f"image/{fmt.lower()}"
    return w, h, content_type
