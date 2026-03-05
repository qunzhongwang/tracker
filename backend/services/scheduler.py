from __future__ import annotations

import asyncio
import logging

from backend.config import get_settings
from backend.database import get_db
from backend.db import repository
from backend.services import slurm, resource_monitor, notification_service

logger = logging.getLogger(__name__)

_tasks: list[asyncio.Task] = []


async def _poll_jobs():
    settings = get_settings()
    interval = settings.slurm.poll_interval_seconds

    while True:
        try:
            db = await get_db()
            jobs = await slurm.get_queue()

            for job in jobs:
                # Check for state changes
                existing = await repository.get_job_by_id(db, job["job_id"])
                if existing and existing["state"] != job["state"]:
                    await repository.insert_job_event(
                        db, job["job_id"], existing["state"], job["state"]
                    )

                await repository.upsert_job(db, job)

        except Exception as e:
            logger.error(f"Job polling error: {e}")

        await asyncio.sleep(interval)


async def _poll_resources():
    while True:
        try:
            db = await get_db()
            summary = await resource_monitor.get_cluster_summary()
            snap = resource_monitor.snapshot_dict(summary)
            await repository.insert_resource_snapshot(db, snap)
        except Exception as e:
            logger.error(f"Resource polling error: {e}")

        await asyncio.sleep(300)  # Every 5 minutes


async def _poll_notifications():
    while True:
        try:
            await notification_service.process_events()
        except Exception as e:
            logger.error(f"Notification polling error: {e}")

        await asyncio.sleep(30)


def start_scheduler():
    _tasks.append(asyncio.create_task(_poll_jobs()))
    _tasks.append(asyncio.create_task(_poll_resources()))
    _tasks.append(asyncio.create_task(_poll_notifications()))
    logger.info("Background scheduler started (jobs, resources, notifications)")


def stop_scheduler():
    for task in _tasks:
        task.cancel()
    _tasks.clear()
    logger.info("Background scheduler stopped")
