import threading

from fastapi import APIRouter, HTTPException, Query

from server.db import connection, database_exists
from server.gedcom_id import normalize_gedcom_id
from server.import_service import run_import
from server.schemas.status import RafraichirResponse, StatusResponse
from server.services.personnes import get_arbre, get_personne, rechercher_personnes
from server.services.faits_historiques import (
    get_faits_historiques_stats,
    list_faits_historiques,
)
from server.services.geoloc import get_geoloc
from server.services.warnings import get_warnings_stats, list_warnings

router = APIRouter(prefix="/api", tags=["api"])

_import_lock = threading.Lock()


@router.get("/status", response_model=StatusResponse)
def api_status() -> StatusResponse:
    if not database_exists():
        return StatusResponse(
            importe_le=None,
            nb_personnes=None,
            nb_familles=None,
            nb_actes=None,
            nb_photos=None,
            empreinte_gedcom=None,
            empreinte_actes=None,
            id_gedcom_racine=None,
            version_schema=None,
        )
    with connection(read_only=True) as conn:
        row = conn.execute("SELECT * FROM meta WHERE id = 1").fetchone()
        if not row:
            return StatusResponse(
                importe_le=None,
                nb_personnes=None,
                nb_familles=None,
                nb_actes=None,
                nb_photos=None,
                empreinte_gedcom=None,
                empreinte_actes=None,
                id_gedcom_racine=None,
                version_schema=None,
            )
        return StatusResponse(
            importe_le=row["importe_le"],
            nb_personnes=row["nb_personnes"],
            nb_familles=row["nb_familles"],
            nb_actes=row["nb_actes"],
            nb_photos=row["nb_photos"],
            empreinte_gedcom=row["empreinte_gedcom"],
            empreinte_actes=row["empreinte_actes"],
            id_gedcom_racine=row["id_gedcom_racine"],
            version_schema=row["version_schema"],
        )


@router.post("/rafraichir", response_model=RafraichirResponse)
def api_rafraichir(force: bool = Query(False, description="Forcer l'import même si empreintes identiques")):
    if not _import_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Import déjà en cours")
    try:
        result = run_import(force=force)
    finally:
        _import_lock.release()

    if result["status"] == "unchanged":
        return RafraichirResponse(status="unchanged", message="Données inchangées")
    return RafraichirResponse(
        status="ok",
        nb_personnes=result.get("nb_personnes"),
        nb_familles=result.get("nb_familles"),
        nb_actes=result.get("nb_actes"),
        nb_photos=result.get("nb_photos"),
    )


@router.get("/personnes/{id_gedcom}")
def api_personne(id_gedcom: str):
    try:
        gid = normalize_gedcom_id(id_gedcom)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        personne = get_personne(conn, gid)
    if not personne:
        raise HTTPException(status_code=404, detail=f"Personne introuvable : {gid}")
    return personne


@router.get("/personnes/{id_gedcom}/arbre")
def api_arbre(
    id_gedcom: str,
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(id_gedcom)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        arbre = get_arbre(conn, gid, ancetres, descendants)
    if not arbre:
        raise HTTPException(status_code=404, detail=f"Personne introuvable : {gid}")
    return arbre


@router.get("/recherche")
def api_recherche(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    with connection(read_only=True) as conn:
        total, resultats = rechercher_personnes(conn, q, page, limit)
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "resultats": resultats,
    }


@router.get("/warnings/stats")
def api_warnings_stats(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_warnings_stats(conn, gid, ancetres, descendants)


@router.get("/warnings")
def api_warnings(
    zone: bool = Query(False, description="Limiter au périmètre arbre (ancre + profondeur)"),
    ancre: str = Query(..., description="Id GEDCOM ancre"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return list_warnings(
            conn,
            zone=zone,
            ancre=gid,
            ancetres=ancetres,
            descendants=descendants,
        )


@router.get("/faits-historiques/stats")
def api_faits_historiques_stats(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_faits_historiques_stats(conn, gid, ancetres, descendants)


@router.get("/faits-historiques")
def api_faits_historiques(
    zone: bool = Query(False, description="Limiter au périmètre géographique de l'arbre"),
    ancre: str = Query(..., description="Id GEDCOM ancre"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return list_faits_historiques(
            conn,
            zone=zone,
            ancre=gid,
            ancetres=ancetres,
            descendants=descendants,
        )


@router.get("/geoloc")
def api_geoloc(
    annee: int = Query(..., ge=1000, le=3000, description="Année affichée"),
):
    with connection(read_only=True) as conn:
        return get_geoloc(conn, annee)
