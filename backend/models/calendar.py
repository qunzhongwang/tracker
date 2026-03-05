from __future__ import annotations

from pydantic import BaseModel


class CalendarEvent(BaseModel):
    id: str = ""
    summary: str = ""
    description: str = ""
    start: str = ""
    end: str = ""
    location: str = ""
    all_day: bool = False
    source: str = "google"


class CalendarEventCreate(BaseModel):
    summary: str
    description: str = ""
    start: str
    end: str
    location: str = ""
    all_day: bool = False


class CalendarListResponse(BaseModel):
    events: list[CalendarEvent]
