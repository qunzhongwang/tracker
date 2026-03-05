from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from backend.config import get_settings
from backend.models.calendar import CalendarEvent

logger = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API = "https://www.googleapis.com/calendar/v3"


async def _get_access_token() -> str | None:
    settings = get_settings()
    if not settings.google_calendar.enabled:
        return None
    if not settings.google_calendar.refresh_token:
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "client_id": settings.google_calendar.client_id,
            "client_secret": settings.google_calendar.client_secret,
            "refresh_token": settings.google_calendar.refresh_token,
            "grant_type": "refresh_token",
        })
        if resp.status_code == 200:
            return resp.json().get("access_token")
        logger.error(f"Failed to refresh token: {resp.text}")
        return None


async def list_events(
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 50,
) -> list[CalendarEvent]:
    settings = get_settings()
    if not settings.google_calendar.enabled:
        return []

    token = await _get_access_token()
    if not token:
        return []

    if not time_min:
        time_min = datetime.utcnow().isoformat() + "Z"
    if not time_max:
        time_max = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

    cal_id = settings.google_calendar.calendar_id
    url = f"{CALENDAR_API}/calendars/{cal_id}/events"

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"}, params={
            "timeMin": time_min,
            "timeMax": time_max,
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime",
        })
        if resp.status_code != 200:
            logger.error(f"Calendar API error: {resp.text}")
            return []

        data = resp.json()
        events = []
        for item in data.get("items", []):
            start = item.get("start", {})
            end = item.get("end", {})
            events.append(CalendarEvent(
                id=item.get("id", ""),
                summary=item.get("summary", ""),
                description=item.get("description", ""),
                start=start.get("dateTime", start.get("date", "")),
                end=end.get("dateTime", end.get("date", "")),
                location=item.get("location", ""),
                all_day="date" in start and "dateTime" not in start,
            ))
        return events


async def create_event(
    summary: str,
    start: str,
    end: str,
    description: str = "",
    location: str = "",
) -> CalendarEvent | None:
    settings = get_settings()
    if not settings.google_calendar.enabled:
        return None

    token = await _get_access_token()
    if not token:
        return None

    cal_id = settings.google_calendar.calendar_id
    url = f"{CALENDAR_API}/calendars/{cal_id}/events"

    body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
    }
    if location:
        body["location"] = location

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
        )
        if resp.status_code in (200, 201):
            item = resp.json()
            return CalendarEvent(
                id=item.get("id", ""),
                summary=item.get("summary", ""),
                start=start,
                end=end,
            )
        logger.error(f"Failed to create event: {resp.text}")
        return None


async def delete_event(event_id: str) -> bool:
    settings = get_settings()
    if not settings.google_calendar.enabled:
        return False

    token = await _get_access_token()
    if not token:
        return False

    cal_id = settings.google_calendar.calendar_id
    url = f"{CALENDAR_API}/calendars/{cal_id}/events/{event_id}"

    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers={"Authorization": f"Bearer {token}"})
        return resp.status_code in (200, 204)
