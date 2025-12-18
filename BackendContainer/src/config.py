from typing import List
from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    # App
    APP_NAME: str = Field(default="Device Remote Management API", description="Application name")
    APP_VERSION: str = Field(default="0.1.0", description="Application version")

    # Database
    DATABASE_URL: AnyUrl = Field(..., description="SQLAlchemy async URL (e.g. postgresql+asyncpg://...)")

    # JWT
    JWT_SECRET: str = Field(..., description="Secret used to sign JWT tokens")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    JWT_EXPIRES_IN: int = Field(default=3600, description="JWT expiry in seconds")

    # CORS
    CORS_ORIGINS: str = Field(default="", description="Comma-separated list of allowed CORS origins")

    # Computed
    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return []
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


# PUBLIC_INTERFACE
def get_settings() -> Settings:
    """Return application settings loaded from environment."""
    return Settings()
