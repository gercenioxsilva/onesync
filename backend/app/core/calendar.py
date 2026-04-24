import logging
import threading
from datetime import date

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_event(
    refresh_token: str,
    manager_email: str,
    collaborator_email: str,
    collaborator_name: str,
    next_meeting_date: date,
    summary: str,
) -> None:
    if not settings.google_client_secret or not refresh_token:
        return
    try:
        token_resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
            },
            timeout=10,
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        attendees = [{"email": manager_email}]
        if collaborator_email:
            attendees.append({"email": collaborator_email})

        event_resp = requests.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            params={"sendUpdates": "all"},
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "summary": f"1:1 com {collaborator_name}",
                "description": summary or "",
                "start": {"date": next_meeting_date.isoformat()},
                "end": {"date": next_meeting_date.isoformat()},
                "attendees": attendees,
                "reminders": {"useDefault": True},
            },
            timeout=15,
        )
        event_resp.raise_for_status()
        logger.info(
            "Google Calendar event created: 1:1 with %s on %s",
            collaborator_name,
            next_meeting_date,
        )
    except Exception as exc:
        logger.error("Failed to create Google Calendar event: %s", exc)


def schedule_one_on_one_calendar_event(
    refresh_token: str,
    manager_email: str,
    collaborator_email: str,
    collaborator_name: str,
    next_meeting_date: date,
    summary: str,
) -> None:
    threading.Thread(
        target=_create_event,
        args=(
            refresh_token,
            manager_email,
            collaborator_email,
            collaborator_name,
            next_meeting_date,
            summary,
        ),
        daemon=True,
    ).start()
