from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8420


class SlurmConfig(BaseModel):
    user: str = ""
    default_account: str = ""
    default_partition: str = "gpu"
    poll_interval_seconds: int = 30


class LogsConfig(BaseModel):
    watch_paths: list[str] = Field(default_factory=list)


class TerminalConfig(BaseModel):
    max_terminals: int = 5
    shell: str = "/bin/bash"


class DatabaseConfig(BaseModel):
    path: str = "data/tracker.db"


class NotificationConfig(BaseModel):
    enabled: bool = False
    smtp_host: str = "localhost"
    smtp_port: int = 25
    from_address: str = ""
    to_address: str = ""


class NotionConfig(BaseModel):
    enabled: bool = False
    api_key: str = ""
    database_id: str = ""


class GoogleCalendarConfig(BaseModel):
    enabled: bool = False
    client_id: str = ""
    client_secret: str = ""
    refresh_token: str = ""
    calendar_id: str = "primary"


class AuthConfig(BaseModel):
    enabled: bool = False
    token: str = ""


class Settings(BaseSettings):
    server: ServerConfig = Field(default_factory=ServerConfig)
    slurm: SlurmConfig = Field(default_factory=SlurmConfig)
    logs: LogsConfig = Field(default_factory=LogsConfig)
    terminal: TerminalConfig = Field(default_factory=TerminalConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    notifications: NotificationConfig = Field(default_factory=NotificationConfig)
    notion: NotionConfig = Field(default_factory=NotionConfig)
    google_calendar: GoogleCalendarConfig = Field(default_factory=GoogleCalendarConfig)
    auth: AuthConfig = Field(default_factory=AuthConfig)

    base_dir: str = ""

    model_config = {"env_prefix": "TRACKER_"}


def load_settings(config_path: str | None = None) -> Settings:
    base_dir = Path(__file__).resolve().parent.parent
    if config_path is None:
        config_path = str(base_dir / "config" / "config.yaml")

    data: dict[str, Any] = {}
    if os.path.exists(config_path):
        with open(config_path) as f:
            data = yaml.safe_load(f) or {}

    # Expand env vars in watch_paths
    if "logs" in data and "watch_paths" in data["logs"]:
        expanded = []
        for p in data["logs"]["watch_paths"]:
            expanded.append(os.path.expandvars(p))
        data["logs"]["watch_paths"] = expanded

    # Default slurm user to $USER
    if "slurm" in data:
        if not data["slurm"].get("user"):
            data["slurm"]["user"] = os.environ.get("USER", "")
    else:
        data["slurm"] = {"user": os.environ.get("USER", "")}

    settings = Settings(**data)
    settings.base_dir = str(base_dir)
    return settings


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings
