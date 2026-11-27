from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./scribeo_dev.db"
    supabase_url: str = "https://example.supabase.co"
    supabase_service_key: str = "dev-service-key"
    supabase_jwt_secret: str = "dev-jwt-secret"
    supabase_jwt_audience: str = "authenticated"
    supabase_jwks_url: str = ""
    supabase_jwt_issuer: str = ""
    allow_dev_tokens: bool = True
    storage_bucket: str = "scans"

    @property
    def resolved_supabase_jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def resolved_supabase_jwt_issuer(self) -> str:
        if self.supabase_jwt_issuer:
            return self.supabase_jwt_issuer
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

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
