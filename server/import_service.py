"""Import / rafraîchissement des données."""

from __future__ import annotations

import hashlib
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from server.config import BDD_SCRIPTS_DIR, GEDCOM_PATH, GEDCOM_RAW_URL, SQLITE_PATH


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_meta_empreintes() -> tuple[str | None, str | None]:
    import sqlite3

    if not SQLITE_PATH.is_file():
        return None, None
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        row = conn.execute(
            "SELECT empreinte_gedcom, empreinte_actes FROM meta WHERE id = 1"
        ).fetchone()
        if not row:
            return None, None
        return row[0], row[1]
    finally:
        conn.close()


def _remote_gedcom_empreinte() -> str:
    request = urllib.request.Request(
        GEDCOM_RAW_URL,
        headers={"User-Agent": "genealogie-import/1.0"},
    )
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=120) as response:
        while True:
            chunk = response.read(1 << 20)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _remote_actes_empreinte() -> str:
    import sys

    ws_root = BDD_SCRIPTS_DIR.parent.parent
    if str(ws_root) not in sys.path:
        sys.path.insert(0, str(ws_root))
    if str(BDD_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(BDD_SCRIPTS_DIR))
    from import_actes import fetch_github_actes_tree, tree_empreinte

    blobs = fetch_github_actes_tree()
    return tree_empreinte(blobs)


def empreintes_inchangees() -> bool:
    gedcom_hash, actes_hash = _read_meta_empreintes()
    if gedcom_hash is None:
        return False
    try:
        remote_ged = _remote_gedcom_empreinte()
        remote_actes = _remote_actes_empreinte()
        return gedcom_hash == remote_ged and actes_hash == remote_actes
    except OSError:
        if not GEDCOM_PATH.is_file():
            return False
        return gedcom_hash == _sha256_file(GEDCOM_PATH)


def _download_gedcom(dest: Path) -> None:
    request = urllib.request.Request(
        GEDCOM_RAW_URL,
        headers={"User-Agent": "genealogie-import/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        dest.write_bytes(response.read())


def _gedcom_for_import() -> Path:
    if GEDCOM_PATH.is_file():
        return GEDCOM_PATH
    tmp = Path(tempfile.gettempdir()) / "fminier.ged"
    _download_gedcom(tmp)
    return tmp


def run_import(force: bool = False) -> dict:
    if not force and empreintes_inchangees():
        return {"status": "unchanged"}

    gedcom = _gedcom_for_import()
    scripts = BDD_SCRIPTS_DIR

    subprocess.run(
        [sys.executable, str(scripts / "import_gedcom.py"), "--gedcom", str(gedcom), "--db", str(SQLITE_PATH)],
        check=True,
    )
    subprocess.run(
        [sys.executable, str(scripts / "import_actes.py"), "--db", str(SQLITE_PATH)],
        check=True,
    )

    import sqlite3

    conn = sqlite3.connect(SQLITE_PATH)
    try:
        row = conn.execute(
            "SELECT nb_personnes, nb_familles, nb_actes, nb_photos FROM meta WHERE id = 1"
        ).fetchone()
    finally:
        conn.close()

    return {
        "status": "ok",
        "nb_personnes": row[0] if row else None,
        "nb_familles": row[1] if row else None,
        "nb_actes": row[2] if row else None,
        "nb_photos": row[3] if row else None,
    }


def ensure_database() -> None:
    if SQLITE_PATH.is_file():
        return
    run_import(force=True)
