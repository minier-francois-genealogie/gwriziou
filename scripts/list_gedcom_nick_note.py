#!/usr/bin/env python3
"""Liste les NICK et NOTE (niveau personne) du GEDCOM."""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

WS_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WS_ROOT))

from paths import GEDCOM_PATH, GEDCOM_RAW_URL  # noqa: E402
from analyze_ascendance import parse_line  # noqa: E402


def load_gedcom_text() -> tuple[str, str]:
    if GEDCOM_PATH.is_file():
        return GEDCOM_PATH.read_text(encoding="utf-8-sig", errors="replace"), str(GEDCOM_PATH)
    with urllib.request.urlopen(GEDCOM_RAW_URL, timeout=120) as response:
        return response.read().decode("utf-8-sig", errors="replace"), GEDCOM_RAW_URL


def scan(text: str) -> tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]:
    nicks: list[tuple[str, str, str]] = []
    notes: list[tuple[str, str, str]] = []

    cur_id: str | None = None
    cur_name = ""
    in_indi = False
    pending_note: list[str] | None = None

    def flush_note() -> None:
        nonlocal pending_note
        if pending_note is not None and cur_id is not None:
            notes.append((cur_id, cur_name, " ".join(pending_note)))
        pending_note = None

    for raw in text.splitlines():
        parsed = parse_line(raw.rstrip("\r\n"))
        if not parsed:
            continue
        level, tag, val = parsed

        if level == 0 and tag.startswith("@"):
            flush_note()
            if val == "INDI":
                cur_id = tag
                cur_name = ""
                in_indi = True
            else:
                in_indi = False
                cur_id = None
            continue

        if not in_indi or cur_id is None:
            continue

        if level == 1 and tag == "NAME" and "/" in val:
            match = re.match(r"([^/]*)/([^/]*)/?", val)
            if match:
                cur_name = f"{match.group(1).strip()} {match.group(2).strip()}".strip()
        elif level == 2 and tag == "NICK":
            nicks.append((cur_id, cur_name, val.strip()))
        elif level == 1 and tag == "NOTE":
            flush_note()
            pending_note = [val.strip()]
        elif pending_note is not None and level == 2 and tag in {"CONT", "CONC"}:
            pending_note.append(val.strip())
        elif level == 1:
            flush_note()

    flush_note()
    return nicks, notes


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    text, source = load_gedcom_text()
    nicks, notes = scan(text)

    print(f"Source: {source}")
    print(f"=== NICK ({len(nicks)}) ===")
    for gid, name, nick in nicks:
        print(f"{gid}\t{name or '?'}\t{nick}")

    print()
    print(f"=== NOTE niveau personne ({len(notes)}) ===")
    for gid, name, body in notes:
        print(f"{gid}\t{name or '?'}\t{body}")


if __name__ == "__main__":
    main()
