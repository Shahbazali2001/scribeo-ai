from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./scribeo_dev.db"
    supabase_url: str = "https://example.supabase.co"
    supabase_service_key: str = "dev-service-key"
    supabase_jwt_secret: str = "dev-jwt-secret"
    supabase_jwt_audience: str = "authenticated"
    storage_bucket: str = "scans"

    ocr_service_url: str = "http://localhost:8000"
    ocr_service_key: str = "dev-ocr-secret-key"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    daily_scan_limit: int = 30
    daily_summary_limit: int = 20
    min_summary_words: int = 80
    lang_min_chars: int = 25
    english_min_prob: float = 0.65
    min_app_version: str = "1.0.0"


settings = Settings()
