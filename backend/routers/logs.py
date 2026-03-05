from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.models.logs import FileEntry, LogContentResponse, LogSearchResponse
from backend.services import log_viewer

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/roots", response_model=list[FileEntry])
async def get_watch_roots():
    return log_viewer.get_watch_roots()


@router.get("/browse", response_model=list[FileEntry])
async def browse_directory(path: str):
    try:
        return log_viewer.list_directory(path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/read", response_model=LogContentResponse)
async def read_log(
    path: str,
    offset: int = 0,
    limit: int = 1000,
):
    try:
        content, total = log_viewer.read_file(path, offset, limit)
        return LogContentResponse(
            path=path, content=content, total_lines=total,
            offset=offset, limit=limit,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tail")
async def tail_log(
    path: str,
    lines: int = 100,
):
    try:
        content = log_viewer.read_tail(path, lines)
        return {"path": path, "content": content, "lines": lines}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tail/stream")
async def tail_stream(path: str, lines: int = 50):
    try:
        log_viewer._validate_path(path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    async def event_generator():
        last_size = 0
        while True:
            try:
                import os
                current_size = os.path.getsize(path)
                if current_size != last_size:
                    content = log_viewer.read_tail(path, lines)
                    yield f"data: {content}\n\n"
                    last_size = current_size
            except Exception:
                break
            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/search", response_model=LogSearchResponse)
async def search_log(
    path: str,
    query: str,
    max_results: int = Query(100, le=500),
):
    try:
        results = log_viewer.search_file(path, query, max_results)
        return LogSearchResponse(results=results, total=len(results), query=query)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
