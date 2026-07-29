"""Envoi d'e-mails via Resend (notifications)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from server.config import ACCOUNT_REQUEST_TO, RESEND_API_KEY, RESEND_FROM
from server.services.accounts import account_filename

logger = logging.getLogger(__name__)


def notify_account_request(compte: dict) -> None:
    """Notification optionnelle ; n'échoue pas si Resend n'est pas configuré."""
    if not RESEND_API_KEY or not ACCOUNT_REQUEST_TO:
        logger.info("Notification compte ignorée (RESEND_API_KEY / ACCOUNT_REQUEST_TO)")
        return

    filename = account_filename(compte["email"])
    body_text = (
        "Nouvelle demande de compte Gwriziou (fichier créé, actif=false).\n\n"
        f"Email : {compte.get('email')}\n"
        f"Nom : {compte.get('nom')}\n"
        f"Prénom : {compte.get('prenom')}\n"
        f"Rôle : {compte.get('role')}\n"
        f"Actif : {compte.get('actif')}\n"
        f"Fichier : app/comptes/{filename}\n\n"
        "Activez le compte depuis Admin → Gestion de compte.\n"
    )
    payload = {
        "from": RESEND_FROM,
        "to": [ACCOUNT_REQUEST_TO],
        "subject": (
            f"[Gwriziou] Demande de compte — "
            f"{compte.get('prenom', '')} {compte.get('nom', '')}"
        ).strip(),
        "text": body_text,
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "gwriziou-api/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.warning("Resend a refusé la notification (%s): %s", exc.code, detail)
    except OSError as exc:
        logger.warning("Impossible de joindre Resend: %s", exc)
