from __future__ import annotations

from pydantic import BaseModel


class JobInfo(BaseModel):
    job_id: str
    job_name: str = ""
    user_name: str = ""
    partition_name: str = ""
    account: str = ""
    state: str = ""
    nodes: str = ""
    num_nodes: int = 0
    num_cpus: int = 0
    num_gpus: int = 0
    submit_time: str = ""
    start_time: str = ""
    end_time: str = ""
    time_limit: str = ""
    work_dir: str = ""
    command: str = ""
    stdout_path: str = ""
    stderr_path: str = ""
    exit_code: int | None = None


class JobListResponse(BaseModel):
    jobs: list[JobInfo]
    total: int


class JobSubmitRequest(BaseModel):
    script: str = ""
    command: str = ""
    partition: str = ""
    account: str = ""
    job_name: str = ""
    num_nodes: int = 1
    num_cpus: int = 1
    num_gpus: int = 0
    time_limit: str = "01:00:00"
    memory: str = ""
    extra_args: list[str] = []


class JobSubmitResponse(BaseModel):
    job_id: str
    message: str = ""


class JobCancelResponse(BaseModel):
    job_id: str
    message: str = ""


class CommandPreset(BaseModel):
    id: int | None = None
    name: str
    description: str = ""
    command: str
    category: str = "general"


class JobEventInfo(BaseModel):
    job_id: str
    old_state: str
    new_state: str
    timestamp: str
