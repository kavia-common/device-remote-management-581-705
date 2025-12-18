from typing import List, Optional
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

    # Celery / Redis
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0", description="Celery broker URL (Redis)")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1", description="Celery result backend (Redis)")

    # Realtime (SSE)
    ENABLE_SSE: bool = Field(default=True, description="Enable SSE job progress endpoint")
    
    # Protocol Client Configuration
    
    # SNMP defaults
    SNMP_DEFAULT_TIMEOUT: float = Field(default=5.0, description="Default SNMP timeout in seconds")
    SNMP_DEFAULT_RETRIES: int = Field(default=3, description="Default SNMP retry count")
    SNMP_DEFAULT_PORT: int = Field(default=161, description="Default SNMP port")
    SNMP_MAX_REPETITIONS: int = Field(default=25, description="Default BULKWALK max repetitions")
    
    # WebPA defaults
    WEBPA_DEFAULT_TIMEOUT: float = Field(default=30.0, description="Default WebPA timeout in seconds")
    WEBPA_DEFAULT_RETRIES: int = Field(default=3, description="Default WebPA retry count")
    WEBPA_ENDPOINT: Optional[str] = Field(default=None, description="Default WebPA service endpoint (optional)")
    
    # TR-069 defaults
    TR069_DEFAULT_TIMEOUT: float = Field(default=60.0, description="Default TR-069 timeout in seconds")
    TR069_DEFAULT_RETRIES: int = Field(default=3, description="Default TR-069 retry count")
    TR069_ACS_ENDPOINT: Optional[str] = Field(default=None, description="ECO ACS REST API endpoint (optional)")
    TR069_ACS_USERNAME: Optional[str] = Field(default=None, description="ECO ACS API username (optional)")
    TR069_ACS_PASSWORD: Optional[str] = Field(default=None, description="ECO ACS API password (optional)")
    
    # USP defaults
    USP_DEFAULT_TIMEOUT: float = Field(default=30.0, description="Default USP timeout in seconds")
    USP_DEFAULT_RETRIES: int = Field(default=3, description="Default USP retry count")
    USP_CONTROLLER_ENDPOINT: Optional[str] = Field(default=None, description="USP controller REST API endpoint (optional)")
    USP_TRANSPORT_MODE: str = Field(default="http", description="USP transport mode: http, mqtt, or websocket")
    USP_MQTT_BROKER: Optional[str] = Field(default=None, description="MQTT broker URL for USP (optional)")
    USP_MQTT_PORT: int = Field(default=1883, description="MQTT broker port for USP")

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
