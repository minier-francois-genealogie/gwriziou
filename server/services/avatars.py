"""Avatar individu — fichier type A sous sources/documents/{chemin}/."""

from __future__ import annotations

import base64
import re
import sqlite3
from pathlib import Path

from paths import ACTES_BASE_URL, ACTES_DIR, DOCUMENTS_REL_PREFIX
from server.services.acte_dossier import fetch_dossier_actes
from server.services.github_data import (
    get_file_sha,
    github_write_configured,
    put_bytes,
)

_AVATAR_IN_NAME = re.compile(r"__[Aa]__")
MAX_AVATAR_BYTES = 900_000


def is_avatar_filename(nom_fichier: str) -> bool:
    return bool(_AVATAR_IN_NAME.search(Path(nom_fichier).name))


def avatar_filename_from_cle(cle: str) -> str:
    """MINIER__Francois__1981-11-03__56__Ploermel → …__A__1981-11-03__56__Ploermel.jpg"""
    parts = [p for p in cle.strip().split("__") if p]
    if len(parts) < 5:
        raise ValueError(f"clé personne invalide pour avatar : {cle}")
    nom, prenoms, date, dept, commune = parts[0], parts[1], parts[2], parts[3], parts[4]
    return f"{nom}__{prenoms}__A__{date}__{dept}__{commune}.jpg"


def decode_image_payload(data_url_or_b64: str) -> bytes:
    raw = data_url_or_b64.strip()
    if raw.startswith("data:"):
        _, _, b64 = raw.partition(",")
        raw = b64
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise ValueError("image base64 invalide") from exc
    if len(data) < 32:
        raise ValueError("image trop petite")
    if len(data) > MAX_AVATAR_BYTES:
        raise ValueError(f"image trop lourde (max {MAX_AVATAR_BYTES} octets)")
    if data[:3] == b"\xff\xd8\xff":
        return data
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return data
    raise ValueError("format image non supporté (JPEG ou PNG)")


def _upsert_photo_row(
    conn: sqlite3.Connection,
    *,
    id_gedcom: str,
    cle_personne: str,
    chemin_dossier: str,
    nom_fichier: str,
    chemin_relatif: str,
    url: str,
    taille: int,
) -> None:
    conn.execute(
        """
        DELETE FROM photos
        WHERE id_gedcom = ?
          AND (nom_fichier LIKE '%__A__%' OR nom_fichier LIKE '%__a__%')
        """,
        (id_gedcom,),
    )
    conn.execute(
        "DELETE FROM photos WHERE chemin_relatif = ?",
        (chemin_relatif,),
    )
    conn.execute(
        """
        INSERT INTO photos (
            cle_personne, chemin_dossier, nom_fichier, chemin_relatif, url,
            suffixe, taille_fichier, id_gedcom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            cle_personne,
            chemin_dossier,
            nom_fichier,
            chemin_relatif,
            url,
            None,
            taille,
            id_gedcom,
        ),
    )
    conn.commit()


def save_avatar(
    conn: sqlite3.Connection,
    *,
    id_gedcom: str,
    image_b64: str,
) -> dict:
    row = conn.execute(
        "SELECT nom, prenoms FROM personnes WHERE id_gedcom = ?",
        (id_gedcom,),
    ).fetchone()
    if not row:
        raise FileNotFoundError("Personne introuvable")

    dossier = fetch_dossier_actes(conn, id_gedcom, row["nom"], row["prenoms"])
    chemin = dossier.chemin.strip().strip("/")
    parts = chemin.split("/")
    if len(parts) != 3:
        raise ValueError("chemin dossier actes invalide")
    cle = parts[2]
    nom_fichier = avatar_filename_from_cle(cle)
    chemin_relatif = f"{chemin}/{nom_fichier}"
    rel_github = f"{DOCUMENTS_REL_PREFIX}/{chemin_relatif}"
    data = decode_image_payload(image_b64)

    wrote = False
    if github_write_configured():
        sha = get_file_sha(rel_github)
        put_bytes(
            rel_github,
            data,
            message=f"avatar: {chemin_relatif}",
            sha=sha,
        )
        wrote = True

    local = ACTES_DIR / Path(chemin) / nom_fichier
    if ACTES_DIR.exists() or ACTES_DIR.parent.exists():
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_bytes(data)
        wrote = True

    if not wrote:
        raise RuntimeError(
            "Impossible d'enregistrer l'avatar : configurez GITHUB_TOKEN "
            "ou le clone local data/sources/documents"
        )

    url = f"{ACTES_BASE_URL.rstrip('/')}/{chemin_relatif}"
    _upsert_photo_row(
        conn,
        id_gedcom=id_gedcom,
        cle_personne=cle,
        chemin_dossier=chemin,
        nom_fichier=nom_fichier,
        chemin_relatif=chemin_relatif,
        url=url,
        taille=len(data),
    )
    return {
        "id_gedcom": id_gedcom,
        "url": url,
        "nom_fichier": nom_fichier,
        "chemin": chemin,
    }
