from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request

from server.auth_session import require_session
from server.db import connection, database_exists
from server.gedcom_id import normalize_gedcom_id
from server.import_service import empreintes_inchangees, run_import
from server.import_state import is_import_en_cours
from server.schemas.profession_mapping import (
    ProfessionMappingListResponse,
    ProfessionMappingLigne,
    ProfessionMappingUpdate,
)
from server.services.personnes import get_arbre, get_personne, rechercher_personnes
from server.services.faits_historiques import (
    get_faits_historiques_stats,
    list_faits_historiques,
)
from server.services.dirigeants_france import (
    get_dirigeants_france_stats,
    list_dirigeants_france,
)
from server.services.analyse import (
    get_analyse_stats,
    get_evolution_noms,
    get_professions_nuage,
)
from server.services.geoloc import get_geoloc
from server.services.profession_mapping import (
    list_profession_mappings,
    reset_profession_mapping,
    upsert_profession_mapping,
)
from server.services.warnings import get_warnings_stats, list_warnings
from server.schemas.status import RafraichirResponse, StatusResponse
from server.schemas.accounts import (
    CompteActifUpdate,
    CompteListResponse,
    CompteLigne,
    HashPasswordRequest,
    HashPasswordResponse,
)
from server.services.accounts import hash_password, list_accounts_public, set_account_actif
from server.services.github_data import GitHubDataError

router = APIRouter(prefix="/api", tags=["api"])


def _require_admin(request: Request) -> dict:
    session = require_session(request)
    if str(session.get("role") or "") != "admin":
        raise HTTPException(status_code=403, detail="Droits administrateur requis")
    return session


def _status_payload(**fields) -> StatusResponse:
    return StatusResponse(import_en_cours=is_import_en_cours(), **fields)


@router.get("/status", response_model=StatusResponse)
def api_status() -> StatusResponse:
    if is_import_en_cours():
        return _status_payload(
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
    if not database_exists():
        return _status_payload(
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
            return _status_payload(
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
        return _status_payload(
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
def api_rafraichir(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Forcer l'import même si empreintes identiques"),
):
    if is_import_en_cours():
        raise HTTPException(status_code=409, detail="Import déjà en cours")

    if not force and empreintes_inchangees():
        return RafraichirResponse(status="unchanged", message="Données inchangées")

    background_tasks.add_task(run_import, force)
    return RafraichirResponse(status="running", message="Import en cours")


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


@router.get("/dirigeants-france/stats")
def api_dirigeants_france_stats(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_dirigeants_france_stats(conn, gid, ancetres, descendants)


@router.get("/dirigeants-france")
def api_dirigeants_france(
    zone: bool = Query(False, description="Limiter au périmètre de l'arbre"),
    ancre: str = Query(..., description="Id GEDCOM ancre"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return list_dirigeants_france(
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


@router.get("/analyse/stats")
def api_analyse_stats(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
    zone: bool = Query(True, description="Limiter au périmètre de l'arbre"),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_analyse_stats(conn, gid, ancetres, descendants, zone=zone)


@router.get("/analyse/professions")
def api_analyse_professions(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
    zone: bool = Query(True, description="Limiter au périmètre de l'arbre"),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_professions_nuage(conn, gid, ancetres, descendants, zone=zone)


@router.get("/analyse/noms")
def api_analyse_noms(
    ancre: str = Query(..., description="Id GEDCOM ancre pour le périmètre zone"),
    ancetres: int = Query(4, ge=0, le=20),
    descendants: int = Query(2, ge=0, le=20),
    zone: bool = Query(True, description="Limiter au périmètre de l'arbre"),
):
    try:
        gid = normalize_gedcom_id(ancre)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    with connection(read_only=True) as conn:
        return get_evolution_noms(conn, gid, ancetres, descendants, zone=zone)


@router.get("/gestion/professions", response_model=ProfessionMappingListResponse)
def api_gestion_professions_list():
    with connection(read_only=False) as conn:
        return list_profession_mappings(conn)


@router.put("/gestion/professions", response_model=ProfessionMappingLigne)
def api_gestion_professions_update(payload: ProfessionMappingUpdate):
    try:
        with connection(read_only=False) as conn:
            return upsert_profession_mapping(conn, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/gestion/professions")
def api_gestion_professions_reset(
    profession_brute: str = Query(..., description="Profession brute à réinitialiser"),
):
    try:
        with connection(read_only=False) as conn:
            reset_profession_mapping(conn, profession_brute)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@router.get("/admin/comptes", response_model=CompteListResponse)
def api_admin_comptes(request: Request) -> CompteListResponse:
    _require_admin(request)
    try:
        rows, source = list_accounts_public()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CompteListResponse(
        comptes=[CompteLigne(**row) for row in rows],
        source_fichier=source,
    )


@router.patch("/admin/comptes/actif", response_model=CompteLigne)
def api_admin_compte_actif(payload: CompteActifUpdate, request: Request) -> CompteLigne:
    _require_admin(request)
    try:
        row = set_account_actif(payload.email, payload.actif)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RuntimeError, GitHubDataError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return CompteLigne(**row)


@router.post("/admin/hash-password", response_model=HashPasswordResponse)
def api_admin_hash_password(
    payload: HashPasswordRequest,
    request: Request,
) -> HashPasswordResponse:
    _require_admin(request)
    return HashPasswordResponse(password_hash=hash_password(payload.password))
