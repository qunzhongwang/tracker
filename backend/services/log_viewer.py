from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path

from backend.config import get_settings
from backend.models.logs import FileEntry, LogSearchResult


def _validate_path(path: str) -> Path:
    settings = get_settings()
    resolved = Path(path).resolve()
    allowed = False
    for watch_path in settings.logs.watch_paths:
        wp = Path(watch_path).resolve()
        try:
            resolved.relative_to(wp)
            allowed = True
            break
        except ValueError:
            continue

    if not allowed:
        raise PermissionError(f"Access denied: {path} is not under any watch path")
    return resolved


def list_directory(path: str) -> list[FileEntry]:
    resolved = _validate_path(path)
    if not resolved.is_dir():
        raise FileNotFoundError(f"Not a directory: {path}")

    entries = []
    try:
        for item in sorted(resolved.iterdir()):
            try:
                stat = item.stat()
                entries.append(FileEntry(
                    name=item.name,
                    path=str(item),
                    is_dir=item.is_dir(),
                    size=stat.st_size if not item.is_dir() else 0,
                    modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                ))
            except OSError:
                continue
    except PermissionError:
        raise PermissionError(f"Cannot read directory: {path}")
    return entries


def get_watch_roots() -> list[FileEntry]:
    settings = get_settings()
    roots = []
    for wp in settings.logs.watch_paths:
        p = Path(wp)
        if p.exists():
            roots.append(FileEntry(
                name=p.name,
                path=str(p),
                is_dir=True,
            ))
    return roots


def read_file(
    path: str,
    offset: int = 0,
    limit: int = 1000,
) -> tuple[str, int]:
    resolved = _validate_path(path)
    if not resolved.is_file():
        raise FileNotFoundError(f"Not a file: {path}")

    with open(resolved) as f:
        lines = f.readlines()

    total = len(lines)
    selected = lines[offset : offset + limit]
    return "".join(selected), total


def read_tail(path: str, lines: int = 100) -> str:
    resolved = _validate_path(path)
    if not resolved.is_file():
        raise FileNotFoundError(f"Not a file: {path}")

    with open(resolved, "rb") as f:
        # Seek from end for efficiency
        try:
            f.seek(0, 2)
            size = f.tell()
            # Read last chunk (generous buffer)
            chunk_size = min(size, lines * 200)
            f.seek(max(0, size - chunk_size))
            data = f.read().decode("utf-8", errors="replace")
            result_lines = data.splitlines()[-lines:]
            return "\n".join(result_lines)
        except Exception:
            f.seek(0)
            all_lines = f.read().decode("utf-8", errors="replace").splitlines()
            return "\n".join(all_lines[-lines:])


def search_file(path: str, query: str, max_results: int = 100) -> list[LogSearchResult]:
    resolved = _validate_path(path)
    if not resolved.is_file():
        raise FileNotFoundError(f"Not a file: {path}")

    results = []
    try:
        pattern = re.compile(query, re.IGNORECASE)
    except re.error:
        pattern = re.compile(re.escape(query), re.IGNORECASE)

    with open(resolved, errors="replace") as f:
        for i, line in enumerate(f, 1):
            if pattern.search(line):
                results.append(LogSearchResult(
                    path=str(resolved),
                    line_number=i,
                    line=line.rstrip()[:500],
                ))
                if len(results) >= max_results:
                    break
    return results
