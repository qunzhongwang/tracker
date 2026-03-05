from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.models.calendar import CalendarEvent, CalendarEventCreate, CalendarListResponse
from backend.services import calendar_service

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("", response_model=CalendarListResponse)
async def list_events(
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 50,
):
    events = await calendar_service.list_events(time_min, time_max, max_results)
    return CalendarListResponse(events=events)


@router.post("", response_model=CalendarEvent)
async def create_event(req: CalendarEventCreate):
    event = await calendar_service.create_event(
        summary=req.summary,
        start=req.start,
        end=req.end,
        description=req.description,
        location=req.location,
    )
    if not event:
        raise HTTPException(status_code=400, detail="Failed to create event")
    return event


@router.delete("/{event_id}")
async def delete_event(event_id: str):
    success = await calendar_service.delete_event(event_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete event")
    return {"status": "deleted", "id": event_id}
