from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite

from backend.dependencies import get_database
from backend.models.jobs import (
    JobInfo, JobListResponse, JobSubmitRequest, JobSubmitResponse, JobCancelResponse,
)
from backend.services import slurm
from backend.db import repository

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    state: str | None = None,
    source: str = Query("live", description="'live' for squeue, 'history' for sacct, 'cached' for DB"),
    limit: int = 100,
    offset: int = 0,
    db: aiosqlite.Connection = Depends(get_database),
):
    if source == "live":
        jobs = await slurm.get_queue()
        # Cache them
        for j in jobs:
            await repository.upsert_job(db, j)
        if state:
            jobs = [j for j in jobs if j["state"].upper() == state.upper()]
        return JobListResponse(
            jobs=[JobInfo(**j) for j in jobs],
            total=len(jobs),
        )
    elif source == "history":
        jobs = await slurm.get_job_history(limit=limit)
        for j in jobs:
            await repository.upsert_job(db, j)
        return JobListResponse(
            jobs=[JobInfo(**j) for j in jobs],
            total=len(jobs),
        )
    else:
        rows, total = await repository.get_jobs(db, state=state, limit=limit, offset=offset)
        return JobListResponse(
            jobs=[JobInfo(**r) for r in rows],
            total=total,
        )


@router.get("/{job_id}", response_model=JobInfo)
async def get_job(
    job_id: str,
    db: aiosqlite.Connection = Depends(get_database),
):
    row = await repository.get_job_by_id(db, job_id)
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobInfo(**row)


@router.post("/submit", response_model=JobSubmitResponse)
async def submit_job(req: JobSubmitRequest):
    job_id, message = await slurm.submit_job(
        script=req.script,
        command=req.command,
        partition=req.partition,
        account=req.account,
        job_name=req.job_name,
        num_nodes=req.num_nodes,
        num_cpus=req.num_cpus,
        num_gpus=req.num_gpus,
        time_limit=req.time_limit,
        memory=req.memory,
        extra_args=req.extra_args,
    )
    if not job_id:
        raise HTTPException(status_code=400, detail=message)
    return JobSubmitResponse(job_id=job_id, message=message)


@router.post("/{job_id}/cancel", response_model=JobCancelResponse)
async def cancel_job(job_id: str):
    success, message = await slurm.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return JobCancelResponse(job_id=job_id, message=message)
