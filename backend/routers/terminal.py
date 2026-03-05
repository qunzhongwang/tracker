from __future__ import annotations

import asyncio
import os
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from backend.models.terminal import (
    TerminalSession as TerminalSessionModel,
    TerminalCreateRequest,
    TerminalResizeRequest,
    TerminalListResponse,
)
from backend.services.terminal_manager import get_terminal_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


@router.get("", response_model=TerminalListResponse)
async def list_terminals():
    mgr = get_terminal_manager()
    sessions = mgr.list_sessions()
    return TerminalListResponse(
        terminals=[TerminalSessionModel(**s) for s in sessions]
    )


@router.post("", response_model=TerminalSessionModel)
async def create_terminal(req: TerminalCreateRequest):
    mgr = get_terminal_manager()
    try:
        session = mgr.create_session(title=req.title, cols=req.cols, rows=req.rows)
        return TerminalSessionModel(
            id=session.id,
            pid=session.pid,
            created_at=session.created_at,
            title=session.title,
            cols=session.cols,
            rows=session.rows,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.delete("/{session_id}")
async def destroy_terminal(session_id: str):
    mgr = get_terminal_manager()
    if mgr.destroy_session(session_id):
        return {"status": "destroyed", "id": session_id}
    raise HTTPException(status_code=404, detail="Terminal not found")


@router.post("/{session_id}/resize")
async def resize_terminal(session_id: str, req: TerminalResizeRequest):
    mgr = get_terminal_manager()
    session = mgr.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Terminal not found")
    session.resize(req.cols, req.rows)
    return {"status": "resized", "cols": req.cols, "rows": req.rows}


@router.websocket("/ws/{session_id}")
async def terminal_ws(websocket: WebSocket, session_id: str):
    mgr = get_terminal_manager()
    session = mgr.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Terminal not found")
        return

    await websocket.accept()

    async def read_pty():
        loop = asyncio.get_event_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, _read_fd, session.fd)
                if data:
                    await websocket.send_bytes(data)
                else:
                    await asyncio.sleep(0.01)
            except OSError:
                break
            except Exception:
                break

    async def write_pty():
        while True:
            try:
                data = await websocket.receive_bytes()
                os.write(session.fd, data)
            except WebSocketDisconnect:
                break
            except Exception:
                break

    reader = asyncio.create_task(read_pty())
    writer = asyncio.create_task(write_pty())

    try:
        done, pending = await asyncio.wait(
            [reader, writer], return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    except Exception:
        reader.cancel()
        writer.cancel()


def _read_fd(fd: int) -> bytes:
    try:
        return os.read(fd, 4096)
    except BlockingIOError:
        return b""
    except OSError:
        raise
