from __future__ import annotations

import json
import logging
import re
import shlex
from datetime import datetime

from backend.config import get_settings
from backend.utils.process import run_command

logger = logging.getLogger(__name__)


def _epoch_to_iso(epoch: int | None) -> str:
    if not epoch or epoch == 0:
        return ""
    try:
        return datetime.fromtimestamp(epoch).isoformat()
    except (OSError, ValueError):
        return ""


def _parse_tres_gpus(tres_val) -> int:
    if not tres_val:
        return 0
    # List of dicts format: [{"type": "gres", "name": "gpu", "count": 4}, ...]
    if isinstance(tres_val, list):
        for item in tres_val:
            if isinstance(item, dict):
                if item.get("type") == "gres" and item.get("name") == "gpu":
                    return item.get("count", 0)
        return 0
    # String format: "cpu=64,mem=786432M,node=1,billing=76,gres/gpu=4"
    if isinstance(tres_val, str):
        for part in tres_val.split(","):
            if "gres/gpu=" in part:
                try:
                    return int(part.split("=")[1])
                except (ValueError, IndexError):
                    pass
    return 0


def _parse_time_limit(minutes: int | None) -> str:
    if not minutes or minutes <= 0:
        return ""
    hours, mins = divmod(minutes, 60)
    days, hours = divmod(hours, 24)
    if days:
        return f"{days}-{hours:02d}:{mins:02d}:00"
    return f"{hours:02d}:{mins:02d}:00"


def _parse_squeue_job(raw: dict) -> dict:
    return {
        "job_id": str(raw.get("job_id", "")),
        "job_name": raw.get("name", ""),
        "user_name": raw.get("user_name", ""),
        "partition_name": raw.get("partition", ""),
        "account": raw.get("account", ""),
        "state": _extract_state(raw.get("job_state", "")),
        "nodes": raw.get("nodes", ""),
        "num_nodes": raw.get("node_count", {}).get("number", 0) if isinstance(raw.get("node_count"), dict) else raw.get("node_count", 0),
        "num_cpus": raw.get("cpus", {}).get("number", 0) if isinstance(raw.get("cpus"), dict) else raw.get("cpus", 0),
        "num_gpus": _parse_tres_gpus(raw.get("tres_alloc_str", "") or raw.get("tres_req_str", "")),
        "submit_time": _epoch_to_iso(raw.get("submit_time", {}).get("number") if isinstance(raw.get("submit_time"), dict) else raw.get("submit_time")),
        "start_time": _epoch_to_iso(raw.get("start_time", {}).get("number") if isinstance(raw.get("start_time"), dict) else raw.get("start_time")),
        "end_time": _epoch_to_iso(raw.get("end_time", {}).get("number") if isinstance(raw.get("end_time"), dict) else raw.get("end_time")),
        "time_limit": _parse_time_limit(raw.get("time_limit", {}).get("number") if isinstance(raw.get("time_limit"), dict) else raw.get("time_limit")),
        "work_dir": raw.get("current_working_directory", ""),
        "command": raw.get("command", ""),
        "stdout_path": raw.get("standard_output", ""),
        "stderr_path": raw.get("standard_error", ""),
        "exit_code": None,
        "raw": raw,
    }


def _extract_state(state) -> str:
    if isinstance(state, list):
        return state[0] if state else ""
    return str(state)


def _parse_sacct_job(raw: dict) -> dict:
    exit_code = raw.get("exit_code", {})
    exit_val = None
    if isinstance(exit_code, dict):
        ret = exit_code.get("return_code", {})
        exit_val = ret.get("number") if isinstance(ret, dict) else ret
    elif isinstance(exit_code, int):
        exit_val = exit_code

    return {
        "job_id": str(raw.get("job_id", "")),
        "job_name": raw.get("name", ""),
        "user_name": raw.get("user", ""),
        "partition_name": raw.get("partition", ""),
        "account": raw.get("account", ""),
        "state": _extract_state(raw.get("state", {}).get("current", "") if isinstance(raw.get("state"), dict) else raw.get("state", "")),
        "nodes": raw.get("nodes", ""),
        "num_nodes": raw.get("allocation_nodes", 0),
        "num_cpus": raw.get("required", {}).get("CPUs", 0) if isinstance(raw.get("required"), dict) else 0,
        "num_gpus": _parse_tres_gpus(raw.get("tres", {}).get("allocated", "") if isinstance(raw.get("tres"), dict) else ""),
        "submit_time": _epoch_to_iso(raw.get("time", {}).get("submission") if isinstance(raw.get("time"), dict) else None),
        "start_time": _epoch_to_iso(raw.get("time", {}).get("start") if isinstance(raw.get("time"), dict) else None),
        "end_time": _epoch_to_iso(raw.get("time", {}).get("end") if isinstance(raw.get("time"), dict) else None),
        "time_limit": "",
        "work_dir": raw.get("working_directory", ""),
        "command": "",
        "stdout_path": "",
        "stderr_path": "",
        "exit_code": exit_val,
        "raw": raw,
    }


async def get_queue(user: str | None = None) -> list[dict]:
    settings = get_settings()
    cmd = ["squeue", "--json"]
    if user:
        cmd.extend(["--user", user])
    elif settings.slurm.user:
        cmd.extend(["--user", settings.slurm.user])

    rc, stdout, stderr = await run_command(cmd)
    if rc != 0:
        logger.error(f"squeue failed: {stderr}")
        return []

    try:
        data = json.loads(stdout)
        jobs_raw = data.get("jobs", [])
        return [_parse_squeue_job(j) for j in jobs_raw]
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse squeue JSON: {e}")
        return []


async def get_job_history(
    user: str | None = None,
    start_time: str = "now-7days",
    limit: int = 200,
) -> list[dict]:
    settings = get_settings()
    u = user or settings.slurm.user
    cmd = ["sacct", "--json", "-S", start_time]
    if u:
        cmd.extend(["--user", u])

    rc, stdout, stderr = await run_command(cmd, timeout=60.0)
    if rc != 0:
        logger.error(f"sacct failed: {stderr}")
        return []

    try:
        data = json.loads(stdout)
        jobs_raw = data.get("jobs", [])
        # Filter out .batch/.extern sub-steps
        main_jobs = [j for j in jobs_raw if "." not in str(j.get("job_id", ""))]
        parsed = [_parse_sacct_job(j) for j in main_jobs[:limit]]
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse sacct JSON: {e}")
        return []


async def submit_job(
    script: str = "",
    command: str = "",
    partition: str = "",
    account: str = "",
    job_name: str = "",
    num_nodes: int = 1,
    num_cpus: int = 1,
    num_gpus: int = 0,
    time_limit: str = "01:00:00",
    memory: str = "",
    extra_args: list[str] | None = None,
) -> tuple[str, str]:
    settings = get_settings()
    cmd = ["sbatch"]

    if partition:
        cmd.extend(["--partition", partition])
    elif settings.slurm.default_partition:
        cmd.extend(["--partition", settings.slurm.default_partition])

    if account:
        cmd.extend(["--account", account])
    elif settings.slurm.default_account:
        cmd.extend(["--account", settings.slurm.default_account])

    if job_name:
        cmd.extend(["--job-name", job_name])
    cmd.extend(["--nodes", str(num_nodes)])
    cmd.extend(["--cpus-per-task", str(num_cpus)])
    if num_gpus > 0:
        cmd.extend(["--gres", f"gpu:{num_gpus}"])
    cmd.extend(["--time", time_limit])
    if memory:
        cmd.extend(["--mem", memory])

    if extra_args:
        for arg in extra_args:
            sanitized = shlex.quote(arg)
            cmd.append(sanitized)

    if script:
        cmd.append(script)
    elif command:
        cmd.extend(["--wrap", command])
    else:
        return "", "No script or command provided"

    rc, stdout, stderr = await run_command(cmd)
    if rc != 0:
        return "", stderr.strip()

    # Parse job ID from "Submitted batch job 12345"
    match = re.search(r"(\d+)", stdout)
    job_id = match.group(1) if match else ""
    return job_id, stdout.strip()


async def cancel_job(job_id: str) -> tuple[bool, str]:
    if not job_id.isdigit():
        return False, "Invalid job ID"
    rc, stdout, stderr = await run_command(["scancel", job_id])
    if rc != 0:
        return False, stderr.strip()
    return True, f"Job {job_id} cancelled"


async def get_cluster_info() -> dict:
    rc, stdout, stderr = await run_command(["sinfo", "--json"])
    if rc != 0:
        logger.error(f"sinfo failed: {stderr}")
        return {"nodes": [], "partitions": []}

    try:
        data = json.loads(stdout)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse sinfo JSON: {e}")
        return {"nodes": [], "partitions": []}
