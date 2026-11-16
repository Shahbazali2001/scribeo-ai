from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ocr_api_key: str = "dev-ocr-secret-key"
    trocr_model: str = "microsoft/trocr-base-handwritten"
    doctr_det_arch: str = "db_mobilenet_v3_large"
    num_beams: int = 4
    batch_size: int = 8
    max_image_side: int = 2000
    max_upload_mb: int = 10
    max_concurrency: int = 1
    queue_timeout_s: float = 30.0
    use_fake_engine: bool = False


settings = Settings()
