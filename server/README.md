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
| GET | `/healthz` | Health check léger (self-ping Render, hors OpenAPI) |
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
| `SELF_PING_ENABLED` | `true` sur Render, `false` en local | Active le self-ping pour éviter le spin-down du plan gratuit |
| `SELF_PING_URL` | `RENDER_EXTERNAL_URL/healthz` sur Render | URL publique pingée (doit être l'URL Render, pas `localhost`) |
| `SELF_PING_INTERVAL_SECONDS` | `840` (14 min) | Intervalle entre deux pings (< 15 min d'inactivité Render) |
| `SELF_PING_TIMEOUT_SECONDS` | `5` | Timeout HTTP du ping |

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
docker build -t gwriziou-api .
docker run --rm -p 8000:8000 -e AUTO_IMPORT=true gwriziou-api
```

Puis http://127.0.0.1:8000/docs

### Plan gratuit vs disque persistant

| | Plan gratuit | Plan payant + disque |
|--|--------------|----------------------|
| SQLite | Éphémère (effacée au redémarrage / cold start) | Montée sur `/data` (1 Go) |
| Comportement | `AUTO_IMPORT=true` recrée la base (~20 s) | Base conservée entre redémarrages |
| Config | `render.yaml` actuel | Ajouter dans Render : Disk → mount `/data`, 1 Go |

Données sources (GEDCOM, scans) : toujours sur GitHub — le serveur ne stocke que l'index SQLite.

### Self-ping (plan gratuit Render)

Sur le plan gratuit, Render **met l'API en veille après 15 minutes** sans trafic entrant. Le redémarrage (cold start) prend environ 30–60 s.

L'API se ping elle-même **automatiquement sur Render**, sans configuration dans le dashboard ni sur l'IHM static :

- Render injecte `RENDER_EXTERNAL_URL` → l'API appelle `…/healthz` toutes les **14 minutes**
- Aucune variable `SELF_PING_*` à ajouter dans `render.yaml` (détection automatique)
- L'IHM (`gwriziou`, static site) n'a **rien à configurer** pour le ping

**Limites importantes :**

- Le self-ping **ne réveille pas** une API déjà en veille : il évite seulement la mise en veille tant que le container tourne
- Une API maintenue éveillée consomme les **750 h/mois** du workspace (environ 720 h pour un service 24h/24)
- Seuls les **web services gratuits** consomment ces heures ; l'IHM static ne les utilise pas

Pour **désactiver** le self-ping : `SELF_PING_ENABLED=false` dans l'environnement Render du service `gwriziou-api`.

Consommation Render : **Dashboard → Billing → Monthly Included Usage** (section *Free instance hours*).

### Rafraîchir sans redéployer

`POST /api/rafraichir` — compare empreintes GEDCOM + arbre actes GitHub. Si changement → re-import.

## Rafraîchir (détail)

Compare les empreintes `meta` avec GEDCOM raw + arbre actes GitHub. Si identiques → `{ "status": "unchanged" }`. Sinon relance `import_gedcom` + `import_actes`.

