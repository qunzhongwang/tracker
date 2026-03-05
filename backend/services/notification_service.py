from __future__ import annotations

import json
import logging
import smtplib
from email.mime.text import MIMEText

from backend.config import get_settings
from backend.db import repository
from backend.database import get_db

logger = logging.getLogger(__name__)


def send_email(subject: str, body: str) -> tuple[bool, str]:
    settings = get_settings()
    if not settings.notifications.enabled:
        return False, "Notifications disabled"
    if not settings.notifications.to_address:
        return False, "No recipient configured"

    msg = MIMEText(body)
    msg["Subject"] = f"[HPC Tracker] {subject}"
    msg["From"] = settings.notifications.from_address or f"{settings.slurm.user}@localhost"
    msg["To"] = settings.notifications.to_address

    try:
        with smtplib.SMTP(settings.notifications.smtp_host, settings.notifications.smtp_port) as server:
            server.sendmail(msg["From"], [msg["To"]], msg.as_string())
        return True, "Email sent"
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False, str(e)


def evaluate_condition(condition: dict, event: dict) -> bool:
    if not condition:
        return True

    event_type = condition.get("event_type")
    if event_type and event_type != event.get("event_type"):
        return False

    job_name_pattern = condition.get("job_name_contains")
    if job_name_pattern:
        job_name = event.get("job_name", "")
        if job_name_pattern.lower() not in job_name.lower():
            return False

    states = condition.get("states", [])
    if states and event.get("new_state") not in states:
        return False

    return True


async def process_events():
    db = await get_db()
    events = await repository.get_unnotified_events(db)
    if not events:
        return

    rules = await repository.get_notification_rules(db)
    enabled_rules = [r for r in rules if r.get("enabled")]

    event_ids_to_mark = []

    for event in events:
        event_ids_to_mark.append(event["id"])

        for rule in enabled_rules:
            try:
                condition = json.loads(rule.get("condition_json", "{}"))
            except json.JSONDecodeError:
                condition = {}

            if not evaluate_condition(condition, event):
                continue

            subject = f"Job {event['job_id']}: {event.get('old_state', '?')} -> {event['new_state']}"
            body = (
                f"Job ID: {event['job_id']}\n"
                f"State Change: {event.get('old_state', '?')} -> {event['new_state']}\n"
                f"Time: {event.get('timestamp', '')}\n"
            )

            success, msg = send_email(subject, body)
            await repository.insert_notification_log(db, {
                "rule_id": rule["id"],
                "event_type": event.get("new_state", "unknown"),
                "message": subject,
                "success": success,
                "error_message": "" if success else msg,
            })

    await repository.mark_events_notified(db, event_ids_to_mark)
