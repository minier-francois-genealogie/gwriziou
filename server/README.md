# Serveur API (FastAPI)

API REST en lecture sur `bdd/genealogie.sqlite`. Les scans et photos restent sur GitHub (URLs dans les réponses).

## Installation locale

```powershell
cd c:\Projet\Perso\genealogie\cursor_ws
pip install -r server/requirements.txt
python bdd/scripts/import_all.py
python -m uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

Documentation interactive : http://127.0.0.1:8000/docs

**Alternative :** `AUTO_IMPORT=true` au démarrage (télécharge le GEDCOM depuis GitHub si pas de clone local).

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/status` | Métadonnées import (`meta`, incl. `nb_photos`) |
| GET | `/api/personnes/{id}` | Fiche + actes + photos + relations |
| GET | `/api/personnes/{id}/arbre?ancetres=4&descendants=2` | Sous-graphe arbre (`actes.p` = photo disponible) |
| GET | `/api/recherche?q=minier&page=1&limit=20` | Recherche nom, prénom, profession |
| POST | `/api/rafraichir?force=false` | Re-import GEDCOM + actes GitHub |

`{id}` accepte `@655@` ou `655` (normalisé en `@655@`).

Exemple bloc `photos` dans la fiche :

```json
"photos": [
  { "url": "https://raw.githubusercontent.com/…/Photo_01.jpg", "suffixe": "Photo_01" }
]
```

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SQLITE_PATH` | `bdd/genealogie.sqlite` | Base SQLite |
| `AUTO_IMPORT` | `false` | Import au démarrage (ou si empreintes changées) |
| `CORS_ORIGINS` | `*` | Origines IHM autorisées (virgules) |
| `GEDCOM_PATH` | clone local | GEDCOM local (dev) ; prod = téléchargement raw GitHub |
| `GITHUB_ACTES_TREE_URL` | API GitHub | Listing `actes/` distant |
| `PORT` | `8000` | Port HTTP (injecté par Render) |

## Déploiement Render (API seule)

Le dépôt contient `Dockerfile` + `render.yaml`. Pas besoin de l'IHM pour tester : Swagger sur `/docs`.

### Étapes

1. Pousser le code sur **GitHub** (repo `cursor_ws` ou monorepo).
2. [Render](https://render.com) → **New** → **Blueprint** → sélectionner le repo.
3. Render crée le Web Service Docker avec les variables du blueprint.
4. Premier déploiement : build Docker → démarrage → import GEDCOM + actes (~20 s).
5. Tester : `https://<nom-service>.onrender.com/docs`

### Test Docker en local

```powershell
docker build -t genealogie-api .
docker run --rm -p 8000:8000 -e AUTO_IMPORT=true genealogie-api
```

Puis http://127.0.0.1:8000/docs

### Plan gratuit vs disque persistant

| | Plan gratuit | Plan payant + disque |
|--|--------------|----------------------|
| SQLite | Éphémère (effacée au redémarrage / cold start) | Montée sur `/data` (1 Go) |
| Comportement | `AUTO_IMPORT=true` recrée la base (~20 s) | Base conservée entre redémarrages |
| Config | `render.yaml` actuel | Ajouter dans Render : Disk → mount `/data`, 1 Go |

Données sources (GEDCOM, scans) : toujours sur GitHub — le serveur ne stocke que l'index SQLite.

### Rafraîchir sans redéployer

`POST /api/rafraichir` — compare empreintes GEDCOM + arbre actes GitHub. Si changement → re-import.

## Rafraîchir (détail)

Compare les empreintes `meta` avec GEDCOM raw + arbre actes GitHub. Si identiques → `{ "status": "unchanged" }`. Sinon relance `import_gedcom` + `import_actes`.
