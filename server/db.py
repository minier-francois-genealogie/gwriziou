"""Accès SQLite."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from server.config import SQLITE_PATH


def get_connection(*, read_only: bool = False) -> sqlite3.Connection:
    if read_only:
        uri = f"file:{SQLITE_PATH.resolve()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
    else:
        conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connection(read_only: bool = False) -> Iterator[sqlite3.Connection]:
    conn = get_connection(read_only=read_only)
    try:
        yield conn
    finally:
        conn.close()


def database_exists() -> bool:
    return SQLITE_PATH.is_file()
