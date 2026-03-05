from __future__ import annotations

from pydantic import BaseModel


class NotificationRule(BaseModel):
    id: int | None = None
    name: str
    enabled: bool = True
    event_type: str  # "job_completed", "job_failed", "job_started", "custom"
    condition_json: str = "{}"
    action_type: str = "email"
    action_config: str = "{}"


class NotificationLogEntry(BaseModel):
    id: int | None = None
    rule_id: int | None = None
    event_type: str
    message: str
    sent_at: str = ""
    success: bool = True
    error_message: str = ""


class NotificationRuleListResponse(BaseModel):
    rules: list[NotificationRule]


class NotificationLogResponse(BaseModel):
    entries: list[NotificationLogEntry]
    total: int
