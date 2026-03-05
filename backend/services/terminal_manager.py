from __future__ import annotations

import asyncio
import fcntl
import logging
import os
import pty
import signal
import struct
import termios
import uuid
from datetime import datetime

from backend.config import get_settings

logger = logging.getLogger(__name__)


class TerminalSession:
    def __init__(self, session_id: str, pid: int, fd: int, title: str, cols: int, rows: int):
        self.id = session_id
        self.pid = pid
        self.fd = fd
        self.title = title
        self.cols = cols
        self.rows = rows
        self.created_at = datetime.now().isoformat()
        self._lock = asyncio.Lock()

    def resize(self, cols: int, rows: int):
        self.cols = cols
        self.rows = rows
        try:
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)
        except OSError:
            pass

    def is_alive(self) -> bool:
        try:
            os.kill(self.pid, 0)
            return True
        except OSError:
            return False

    def terminate(self):
        try:
            os.kill(self.pid, signal.SIGTERM)
        except OSError:
            pass
        try:
            os.close(self.fd)
        except OSError:
            pass


class TerminalManager:
    def __init__(self):
        self._sessions: dict[str, TerminalSession] = {}

    @property
    def sessions(self) -> dict[str, TerminalSession]:
        return self._sessions

    def create_session(self, title: str = "Terminal", cols: int = 80, rows: int = 24) -> TerminalSession:
        settings = get_settings()
        if len(self._sessions) >= settings.terminal.max_terminals:
            # Clean up dead sessions first
            self._cleanup_dead()
            if len(self._sessions) >= settings.terminal.max_terminals:
                raise RuntimeError(f"Maximum terminals ({settings.terminal.max_terminals}) reached")

        session_id = str(uuid.uuid4())[:8]
        shell = settings.terminal.shell

        pid, fd = pty.fork()
        if pid == 0:
            # Child process
            os.execvp(shell, [shell, "-l"])
        else:
            # Parent
            # Set non-blocking
            flags = fcntl.fcntl(fd, fcntl.F_GETFL)
            fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            session = TerminalSession(session_id, pid, fd, title, cols, rows)
            session.resize(cols, rows)
            self._sessions[session_id] = session
            logger.info(f"Created terminal session {session_id} (pid={pid})")
            return session

    def get_session(self, session_id: str) -> TerminalSession | None:
        return self._sessions.get(session_id)

    def destroy_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if session:
            session.terminate()
            logger.info(f"Destroyed terminal session {session_id}")
            return True
        return False

    def list_sessions(self) -> list[dict]:
        self._cleanup_dead()
        return [
            {
                "id": s.id,
                "pid": s.pid,
                "created_at": s.created_at,
                "title": s.title,
                "cols": s.cols,
                "rows": s.rows,
            }
            for s in self._sessions.values()
        ]

    def _cleanup_dead(self):
        dead = [sid for sid, s in self._sessions.items() if not s.is_alive()]
        for sid in dead:
            s = self._sessions.pop(sid)
            try:
                os.close(s.fd)
            except OSError:
                pass
            logger.info(f"Cleaned up dead terminal session {sid}")

    def shutdown(self):
        for sid in list(self._sessions):
            self.destroy_session(sid)


_manager: TerminalManager | None = None


def get_terminal_manager() -> TerminalManager:
    global _manager
    if _manager is None:
        _manager = TerminalManager()
    return _manager
