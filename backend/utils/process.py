from __future__ import annotations

import asyncio
import shlex
import logging

logger = logging.getLogger(__name__)


async def run_command(
    cmd: str | list[str],
    timeout: float = 30.0,
) -> tuple[int, str, str]:
    if isinstance(cmd, str):
        args = shlex.split(cmd)
    else:
        args = cmd

    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
        return (
            proc.returncode or 0,
            stdout.decode("utf-8", errors="replace"),
            stderr.decode("utf-8", errors="replace"),
        )
    except asyncio.TimeoutError:
        proc.kill()
        return -1, "", "Command timed out"
    except FileNotFoundError:
        return -1, "", f"Command not found: {args[0]}"
    except Exception as e:
        logger.error(f"Error running command {args}: {e}")
        return -1, "", str(e)
