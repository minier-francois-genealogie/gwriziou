# Scripts BDD



Scripts Python pour créer et alimenter la base SQLite locale.  

À lancer depuis la racine du workspace `cursor_ws/`.



## Arborescence `bdd/`



```text

bdd/

├── SCHEMA_BDD.md       # Documentation du schéma (tables, colonnes)

├── schema.sql          # DDL SQLite (référence, exécuté par les scripts)

├── genealogie.sqlite   # Base générée (gitignored)

└── scripts/

    ├── README.md       # Ce fichier

    ├── init_db.py      # Crée une base vide

    ├── import_gedcom.py    # Purge + import GEDCOM (fichier local)

    ├── import_actes.py     # Index actes depuis GitHub (API distante)

    └── import_all.py       # GEDCOM local + actes GitHub

```



## Sources de données



| Donnée | Dev local | Production / actes |

|--------|-----------|---------------------|

| **GEDCOM** | Clone : `github/data/ged/fminier.ged` | [raw GitHub](https://raw.githubusercontent.com/minier-francois-genealogie/data/main/ged/fminier.ged) |

| **Actes** | *(non utilisé par import_actes)* | [API GitHub](https://api.github.com/repos/minier-francois-genealogie/data/git/trees/main?recursive=1) + URLs `raw.githubusercontent.com` |



`import_actes.py` liste **toujours** le dépôt GitHub distant (pas le clone local).



---



## `init_db.py`



Crée une base SQLite **vide** : supprime `genealogie.sqlite` si elle existe, applique `schema.sql`.



```powershell

python bdd/scripts/init_db.py

```



---



## `import_gedcom.py`



Purge la base, recrée le schéma, importe le **GEDCOM local**.



**Tables :** `personnes` (dont `profession` depuis GEDCOM `OCCU`), `familles`, parenté, `lieux`, `evenements`, `meta` (sans `actes`).



```powershell

python bdd/scripts/import_gedcom.py

```



| Option | Défaut | Description |

|--------|--------|-------------|

| `--gedcom` | `paths.GEDCOM_PATH` | Fichier `.ged` |

| `--db` | `bdd/genealogie.sqlite` | Base SQLite |

| `--souche` | auto (`@655@`) | Id GEDCOM racine |



Variables : `GEDCOM_PATH`, `SOUCHE_GEDCOM_ID`.



---



## `import_actes.py`



Indexe les scans **N/M/D** et les photos **P** depuis **GitHub** (tables `actes` et `photos`, base GEDCOM déjà importée).



1. Appel API `git/trees/…?recursive=1` sur `minier-francois-genealogie/data`

2. Filtre `actes/` — jpg, pdf, png ; ignore placeholders (0 octet)

3. Parse noms v2 (`N`, `M`, `D`, **`P`**), construit URLs publiques

4. Raccorde `id_gedcom` (actes : naissance / mariage / décès ; photos : clé naissance du dossier)

5. Met à jour `meta.empreinte_actes`, `nb_actes`, `nb_photos`



**Ne modifie pas** les tables GEDCOM. **Ne lit pas** le dossier local `github/data/actes/`.



```powershell

python bdd/scripts/import_actes.py

```



| Option | Défaut | Description |

|--------|--------|-------------|

| `--db` | `bdd/genealogie.sqlite` | Base SQLite |

| `--tree-url` | `paths.GITHUB_API_TREE_URL` | URL API arbre Git récursif |



Variables : `SQLITE_PATH`, `GITHUB_ACTES_TREE_URL`, `ACTES_BASE_URL`, `DATA_REPO_BRANCH`.



---



## `import_all.py`



Enchaîne `import_gedcom.py` puis `import_actes.py` — workflow complet.



```powershell

python bdd/scripts/import_all.py

```



Repasse les options `--db`, `--gedcom`, `--souche`, `--tree-url`.



---



## Workflow habituel



```powershell

# Import complet (GEDCOM local + actes GitHub)

python bdd/scripts/import_all.py



# Ou séparément

python bdd/scripts/import_gedcom.py

python bdd/scripts/import_actes.py

```



**Prérequis :** fermer `genealogie.sqlite` dans DB Browser / Cursor (verrou Windows).



---



## Fichiers hors `scripts/`



| Fichier | Rôle |

|---------|------|

| `schema.sql` | DDL des tables |

| `SCHEMA_BDD.md` | Spec fonctionnelle |

| `genealogie.sqlite` | Artefact généré (gitignored) |



---



## Scripts liés (hors `bdd/`)



| Fichier | Rôle |

|---------|------|

| `paths.py` | Chemins dev + URLs GitHub |

| `scripts/generate_ascendance_table.py` | Excel contrôle SOSA (hors SQLite) |


