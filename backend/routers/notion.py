from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from backend.dependencies import get_database
from backend.models.notion import Note, NoteCreate, NoteUpdate, NoteListResponse
from backend.services import notion_service
from backend.db import repository

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=NoteListResponse)
async def list_notes(
    limit: int = 100,
    offset: int = 0,
    db: aiosqlite.Connection = Depends(get_database),
):
    rows, total = await repository.get_notes(db, limit=limit, offset=offset)
    return NoteListResponse(
        notes=[Note(**r) for r in rows],
        total=total,
    )


@router.post("", response_model=Note)
async def create_note(
    req: NoteCreate,
    db: aiosqlite.Connection = Depends(get_database),
):
    note_id = await repository.create_note(db, req.model_dump())
    return Note(id=note_id, **req.model_dump())


@router.put("/{note_id}", response_model=Note)
async def update_note(
    note_id: int,
    req: NoteUpdate,
    db: aiosqlite.Connection = Depends(get_database),
):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await repository.update_note(db, note_id, updates)
    # Return updated note
    rows, _ = await repository.get_notes(db, limit=1, offset=0)
    for r in rows:
        if r.get("id") == note_id:
            return Note(**r)
    raise HTTPException(status_code=404, detail="Note not found")


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: aiosqlite.Connection = Depends(get_database),
):
    await repository.delete_note(db, note_id)
    return {"status": "deleted", "id": note_id}


# Notion integration endpoints
@router.get("/notion/search")
async def search_notion(query: str = ""):
    return await notion_service.search_pages(query)


@router.get("/notion/{page_id}")
async def get_notion_page(page_id: str):
    return await notion_service.get_page_content(page_id)


@router.post("/notion/sync")
async def sync_to_notion(
    note_id: int,
    db: aiosqlite.Connection = Depends(get_database),
):
    rows, _ = await repository.get_notes(db)
    note = None
    for r in rows:
        if r.get("id") == note_id:
            note = r
            break
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    result = await notion_service.create_page(note["title"], note.get("content", ""))
    if not result:
        raise HTTPException(status_code=400, detail="Failed to sync to Notion")

    return {"status": "synced", "notion_page_id": result.get("id", "")}
