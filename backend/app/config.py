from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str
    database_name: str = "personal_system"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 525600  # 1 ano — sessão contínua, sem relogin
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
