from __future__ import annotations

from pydantic import BaseModel


class FileEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int = 0
    modified: str = ""


class LogContentResponse(BaseModel):
    path: str
    content: str
    total_lines: int
    offset: int = 0
    limit: int = 1000


class LogSearchResult(BaseModel):
    path: str
    line_number: int
    line: str


class LogSearchResponse(BaseModel):
    results: list[LogSearchResult]
    total: int
    query: str
