from __future__ import annotations

from pydantic import BaseModel


class Note(BaseModel):
    id: int | None = None
    title: str
    content: str = ""
    job_id: str = ""
    notion_page_id: str = ""
    tags: list[str] = []
    created_at: str = ""
    updated_at: str = ""


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    job_id: str = ""
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    job_id: str | None = None
    tags: list[str] | None = None


class NoteListResponse(BaseModel):
    notes: list[Note]
    total: int
