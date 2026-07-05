"""Géocodage de communes (BAN France, Nominatim ailleurs)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

BAN_SEARCH = "https://api-adresse.data.gouv.fr/search/"
NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "gwriziou-genealogie/1.0"


def _http_get_json(url: str, *, delay: float = 0.05) -> dict | list | None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
        if delay > 0:
            time.sleep(delay)
        return json.loads(data)
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return None


def _france_pays(pays: str | None) -> bool:
    if not pays or not pays.strip():
        return True
    p = pays.strip().upper()
    return p in {"FRANCE", "FR", "FRA"}


def geocode_ban(
    commune: str | None,
    code_postal: str | None = None,
    departement: str | None = None,
) -> tuple[float, float] | None:
    if not commune or not commune.strip():
        return None
    params: dict[str, str] = {"limit": "1", "type": "municipality"}
    city = commune.strip()
    if code_postal and code_postal.isdigit():
        params["postcode"] = code_postal
        params["city"] = city
    else:
        query = city
        if departement and departement.strip().isdigit():
            query = f"{city} {departement.strip()}"
        params["q"] = query
    url = f"{BAN_SEARCH}?{urllib.parse.urlencode(params)}"
    payload = _http_get_json(url)
    if not isinstance(payload, dict):
        return None
    features = payload.get("features") or []
    if not features:
        return None
    coords = features[0].get("geometry", {}).get("coordinates")
    if not coords or len(coords) < 2:
        return None
    lon, lat = float(coords[0]), float(coords[1])
    return lat, lon


def geocode_nominatim(
    commune: str | None,
    pays: str | None = None,
) -> tuple[float, float] | None:
    if not commune or not commune.strip():
        return None
    query = commune.strip()
    if pays and pays.strip():
        query = f"{query}, {pays.strip()}"
    params = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": "1"},
    )
    url = f"{NOMINATIM_SEARCH}?{params}"
    payload = _http_get_json(url, delay=1.0)
    if not isinstance(payload, list) or not payload:
        return None
    item = payload[0]
    try:
        return float(item["lat"]), float(item["lon"])
    except (KeyError, TypeError, ValueError):
        return None


def geocode_lieu(
    *,
    commune: str | None,
    code_postal: str | None = None,
    departement: str | None = None,
    pays: str | None = None,
) -> tuple[float, float] | None:
    if _france_pays(pays):
        coords = geocode_ban(commune, code_postal, departement)
        if coords:
            return coords
    return geocode_nominatim(commune, pays)
