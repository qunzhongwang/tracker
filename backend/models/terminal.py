from __future__ import annotations

from pydantic import BaseModel


class TerminalSession(BaseModel):
    id: str
    pid: int
    created_at: str
    title: str = "Terminal"
    cols: int = 80
    rows: int = 24


class TerminalCreateRequest(BaseModel):
    cols: int = 80
    rows: int = 24
    title: str = "Terminal"


class TerminalResizeRequest(BaseModel):
    cols: int
    rows: int


class TerminalListResponse(BaseModel):
    terminals: list[TerminalSession]
