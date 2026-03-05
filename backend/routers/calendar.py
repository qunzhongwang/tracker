from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
import aiosqlite

from backend.config import get_settings
from backend.dependencies import get_database
from backend.models.calendar import CalendarEvent, CalendarEventCreate, CalendarListResponse
from backend.services import calendar_service
from backend.db import repository

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("", response_model=CalendarListResponse)
async def list_events(
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 50,
    db: aiosqlite.Connection = Depends(get_database),
):
    events: list[CalendarEvent] = []

    # Local events from SQLite
    local_rows = await repository.get_local_events(db, time_min, time_max, max_results)
    for row in local_rows:
        events.append(CalendarEvent(
            id=f"local-{row['id']}",
            summary=row["summary"],
            description=row.get("description", ""),
            start=row["start_time"],
            end=row["end_time"],
            location=row.get("location", ""),
            all_day=bool(row.get("all_day", 0)),
            source="local",
        ))

    # Google Calendar events (if enabled)
    settings = get_settings()
    if settings.google_calendar.enabled:
        google_events = await calendar_service.list_events(time_min, time_max, max_results)
        for e in google_events:
            e.source = "google"
            events.append(e)

    # Sort by start time
    events.sort(key=lambda e: e.start)
    return CalendarListResponse(events=events[:max_results])


@router.post("", response_model=CalendarEvent)
async def create_event(
    req: CalendarEventCreate,
    db: aiosqlite.Connection = Depends(get_database),
):
    # Always create locally
    event_id = await repository.create_local_event(db, {
        "summary": req.summary,
        "start": req.start,
        "end": req.end,
        "description": req.description or "",
        "location": req.location or "",
    })
    return CalendarEvent(
        id=f"local-{event_id}",
        summary=req.summary,
        start=req.start,
        end=req.end,
        description=req.description or "",
        location=req.location or "",
        source="local",
    )


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    db: aiosqlite.Connection = Depends(get_database),
):
    if event_id.startswith("local-"):
        local_id = int(event_id.replace("local-", ""))
        await repository.delete_local_event(db, local_id)
        return {"status": "deleted", "id": event_id}

    # Google Calendar event
    success = await calendar_service.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete event")
    return {"status": "deleted", "id": event_id}
