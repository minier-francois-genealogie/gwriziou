"""Envoi d'e-mails via Resend (demandes de compte)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from server.config import ACCOUNT_REQUEST_TO, RESEND_API_KEY, RESEND_FROM
from server.services.accounts import hash_password


def send_account_request_email(
    *,
    email: str,
    nom: str,
    prenom: str,
    password: str,
) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY non configurée")
    if not ACCOUNT_REQUEST_TO:
        raise RuntimeError("ACCOUNT_REQUEST_TO non configurée")

    password_hash = hash_password(password)
    compte_json = {
        "email": email.strip(),
        "nom": nom.strip(),
        "prenom": prenom.strip(),
        "password_hash": password_hash,
        "role": "user",
        "actif": True,
    }
    body_text = (
        "Nouvelle demande de création de compte Gwriziou.\n\n"
        f"Email : {compte_json['email']}\n"
        f"Nom : {compte_json['nom']}\n"
        f"Prénom : {compte_json['prenom']}\n"
        f"Rôle : {compte_json['role']}\n"
        f"Actif : {compte_json['actif']}\n\n"
        "Entrée à ajouter dans app/auth/accounts.json :\n\n"
        f"{json.dumps(compte_json, ensure_ascii=False, indent=2)}\n"
    )

    payload = {
        "from": RESEND_FROM,
        "to": [ACCOUNT_REQUEST_TO],
        "subject": f"[Gwriziou] Demande de compte — {prenom.strip()} {nom.strip()}",
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
        raise RuntimeError(f"Resend a refusé l'envoi ({exc.code}): {detail}") from exc
    except OSError as exc:
        raise RuntimeError(f"Impossible de joindre Resend: {exc}") from exc
