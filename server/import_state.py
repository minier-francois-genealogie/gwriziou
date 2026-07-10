"""État global d'import (mémoire du processus API)."""

from __future__ import annotations

import threading
from contextlib import contextmanager

_lock = threading.Lock()
_import_en_cours = False


class ImportInProgress(Exception):
    """Un import est déjà en cours sur ce service."""


def is_import_en_cours() -> bool:
    with _lock:
        return _import_en_cours


def try_begin_import() -> bool:
    global _import_en_cours
    with _lock:
        if _import_en_cours:
            return False
        _import_en_cours = True
        return True


def end_import() -> None:
    global _import_en_cours
    with _lock:
        _import_en_cours = False


@contextmanager
def import_guard():
    if not try_begin_import():
        raise ImportInProgress()
    try:
        yield
    finally:
        end_import()
