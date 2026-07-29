# Spécification

## Objectif

Fabriquer une **application IHM** répondant aux besoins listés ci-dessous.

## Architecture des données

Architecture **hybride** : le serveur reste **léger** (pas de stockage des scans volumineux) ; GitHub héberge et sert les actes.

```text
GitHub (repo public data) — source de vérité
https://github.com/minier-francois-genealogie/data
├── sources/
│   ├── gedcom/fminier.ged     →  serveur : téléchargement / clone  →  SQLite
│   └── documents/…/*.jpg      →  restent sur GitHub ; IHM charge via raw.githubusercontent.com
├── referentiels/
│   ├── faits-historiques/     →  import SQLite (faits historiques)
│   └── dirigeants-france/     →  import SQLite (dirigeants)
└── app/
    └── auth/accounts.json     →  comptes applicatifs (auth)
```

| Contexte | GEDCOM | Actes |
|----------|--------|-------|
| **Production** (serveur + IHM déployés) | [raw `sources/gedcom/fminier.ged`](https://raw.githubusercontent.com/minier-francois-genealogie/data/main/sources/gedcom/fminier.ged) ou clone git au démarrage | Listing GitHub (`git ls-tree` / API) ; scans servis par **URL GitHub** |
| **Développement local** | Clone : `github/data/sources/gedcom/fminier.ged` | Clone : `github/data/sources/documents/` |

Le dépôt GitHub est la **seule source de vérité** en prod. Le clone local (`C:\Projet\Perso\genealogie\github\data\`) est un miroir pour le dev et les scripts — **aucun script** dans ce dossier.

Le **fichier GEDCOM** est la **source de vérité** pour les personnes et liens (versionné dans Git, édité via un logiciel de généalogie). Au **démarrage du serveur**, l'application lit le GEDCOM et **initialise une base SQLite** — index dérivé, non édité manuellement.

- **Import au démarrage** : parse du `.ged`, **indexation** des noms de fichiers dans `sources/documents/` (sans télécharger les binaires), peuplement des tables (personnes, événements, lieux, relations, actes).
- **Actes** : données **non sensibles** (archives déjà publiques sur le net). Stockés dans Git pour le **versionnement** et parce qu'ils seront **volumineux** — le serveur Render n'a pas besoin d'un gros espace disque. L'API renvoie des **métadonnées + URL publique** ; l'IHM charge les scans **directement depuis GitHub**.
- **Géocodage** : une fois par **lieu unique** (commune, code postal…), coordonnées lat/lng mises en cache dans SQLite (et optionnellement dans un fichier cache versionné).
- **Re-import sans redémarrage** : bouton **Rafraîchir** → re-sync GEDCOM + re-indexation des actes (noms de fichiers) → reconstruction SQLite. Comparaison par hash pour éviter un re-import inutile.

### Servir les actes (pas de proxy serveur)

L'API **ne transmet pas** les images ; elle renvoie des liens que le navigateur charge depuis GitHub :

```json
{
  "actes": {
    "naissance_url": "https://raw.githubusercontent.com/minier-francois-genealogie/data/main/sources/documents/B/BELLAMY/…/….jpg",
    "mariage_url": null,
    "deces_url": null
  }
}
```

URL renseignée → acte disponible ; `null` → icône grisée.

- **Serveur** : empreinte mémoire/disque minimale (GEDCOM + SQLite uniquement).
- **IHM** : `<img src={url} />` ou visionneuse PDF pointant vers l'URL GitHub.
- **Repo public** : les actes sont accessibles sans authentification (cohérent avec leur nature publique).

### Fichiers volumineux (Git LFS)

| Taille | Solution |
|--------|----------|
| Fichiers < ~50 Mo | Git classique, URL `raw.githubusercontent.com` |
| Nombreux scans lourds | **Git LFS** (quota GitHub ~1 Go gratuit) ; URL de téléchargement LFS ou CDN adapté |


## Fonctionnalités

### Arbre généalogique

- **Personne racine par défaut** : la **souche** (François Xavier MINIER, `id_gedcom` configuré). À l'ouverture et via le bouton « retour racine », l'arbre se centre sur cet individu.
- **Naviguer** dans l'arbre, consulter les personnes et leurs liens.
- Pour un **individu donné**, afficher sur un arbre :
  - ses **ancêtres** sur **n** générations (n configurable)
  - ses **descendants** sur **m** générations (m configurable)
  - ses **conjoint(s)** visibles et cliquables sur l'arbre (ou en périphérie du nœud central)
- **Navigation complète** — parcourir tout l'arbre sans repasser systématiquement par la recherche :
  - **clic** sur tout individu affiché (ancêtre, descendant, frère/sœur, **conjoint**) → recentrer l'arbre sur cette personne
  - **flèches clavier / boutons** :
    - frères et sœurs (← →)
    - parents / enfants (↑ ↓)
    - conjoint(s) (cycle si plusieurs unions)
    - retour à la **souche** (⌂)
  - depuis la **recherche** ou la **carte** : clic sur un résultat → même comportement (centrage arbre)
- L'URL reflète la personne courante (ex. `/tree?id=@655@`) pour partage et retour arrière navigateur.
- Pour chaque **individu** présent dans l'arbre, afficher de manière **concise et lisible** :
  - nom
  - prénom
  - date et lieu de naissance
  - date et lieu de décès
  - sexe (homme / femme)
- Pour chaque **individu**, afficher **3 icônes** (naissance, décès, mariage) — pas un jeu d'icônes superflu :
  - icône **active** si l'acte correspondant existe (scan disponible)
  - icône **grisée** si l'acte est absent
  - **clic** sur une icône active : afficher le scan (modal plein écran, zoom) — chargé depuis l'**URL GitHub** fournie par l'API

### Recherche et filtres

- **Barre de recherche** : nom, prénom, profession (GEDCOM `OCCU`).
- **Filtres** : ville (commune), département, région, période, sexe.
- **Résultats paginés** : clic sur un résultat → fiche individu et/ou centrage de l'arbre sur la personne.
- Les filtres sont synchronisables avec la vue carte (ex. filtrer par « Morbihan », « Augan »).

### Carte géographique

- **Carte interactive** (Leaflet + OpenStreetMap) affichant les **lieux de naissance** (points ou clusters par commune selon le zoom).
- Clic sur un marqueur → fiche de l'individu.
- Filtres carte alignés avec la recherche (ville, département, etc.).

### Rafraîchissement des données

- Bouton **Rafraîchir** (↻) dans l'IHM : re-sync du GEDCOM et **re-indexation** de la liste des actes (noms de fichiers sur GitHub / clone local léger).
- Retour utilisateur : spinner pendant l'import, message de succès (nombre de personnes) ou « GEDCOM inchangé ».
- Optionnel : détection automatique (`GET /api/status` avec hash du GEDCOM chargé) et proposition de rafraîchir.

## Plateformes

Application **web responsive**, compatible mobile, avec une expérience proche d'une **application mobile native** :

- utilisable sur **ordinateur**, **tablette** et **smartphone** (navigateur)
- interface **mobile-first** : navigation tactile, mise en page adaptée aux petits écrans
- possibilité d'**ajouter à l'écran d'accueil** (PWA) pour un usage type « app » sur mobile

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React + TypeScript + Vite |
| **Mobile** | PWA (manifest, service worker, icône écran d'accueil, plein écran) |
| **Style** | CSS responsive / Tailwind (mobile-first) |
| **Arbre généalogique** | Composant SVG ou librairie dédiée (D3, relatives-tree…) |
| **Carte** | react-leaflet + tuiles OpenStreetMap |
| **Backend** | FastAPI (Python) — API REST, parsing GEDCOM, index des actes (métadonnées + URLs) |
| **Stockage actes** | GitHub (repo public) — scans **non** hébergés sur le serveur |
| **Index données** | SQLite (généré à l'import depuis le GEDCOM) |
| **Géocodage** | Nominatim ou BAN (France) — cache des coordonnées par lieu |
| **Source de vérité** | Fichier GEDCOM + scans versionnés dans Git |
| **Déploiement** | Docker + Render (hébergement gratuit) |

## Modèle SQLite (index)

| Table | Contenu |
|-------|---------|
| `personnes` | id GEDCOM, nom, prénoms, sexe, profession, famille enfant… |
| `evenements` | naissance, décès, mariage — date, lieu |
| `lieux` | commune, code postal, département, région, pays, latitude, longitude |
| `famille_enfants`, `famille_conjoints`, `personne_unions` | parent ↔ enfant, conjoints |
| `actes` | clé personne, type (N/D/M), date, lieu, **URL publique GitHub**, lien vers `personnes` |

Détail complet : `bdd/SCHEMA_BDD.md`.

## Déploiement

- Hébergée sur un **serveur gratuit** (Render) — empreinte **légère** : pas de stockage local des scans
- Expose un **service web** (API + IHM)
- Import GEDCOM → SQLite au **démarrage** du conteneur
- **Données en production** (référentiel GitHub, pas de copie locale permanente des scans) :
  - **GEDCOM** : [`sources/gedcom/fminier.ged`](https://github.com/minier-francois-genealogie/data/blob/main/sources/gedcom/fminier.ged) — téléchargé via URL raw ou clone `--depth 1` du dépôt [minier-francois-genealogie/data](https://github.com/minier-francois-genealogie/data) au démarrage / rafraîchissement
  - **Actes** : **non copiés** sur le serveur ; indexation via `git ls-tree` ou API GitHub ; URLs `https://raw.githubusercontent.com/minier-francois-genealogie/data/main/sources/documents/…`
- Bouton **Rafraîchir** : re-fetch du GEDCOM + re-liste des fichiers `sources/documents/`

## Données

### Dépôt Git (source de vérité)

Référentiel **public** : **[minier-francois-genealogie/data](https://github.com/minier-francois-genealogie/data)** — les actes y sont publics (archives en ligne) ; le GEDCOM familial peut rester dans ce repo ou être isolé plus tard si besoin.

| Chemin dans le repo | Contenu |
|---------------------|---------|
| [`sources/gedcom/`](https://github.com/minier-francois-genealogie/data/tree/main/sources/gedcom) | Fichiers GEDCOM |
| [`sources/documents/`](https://github.com/minier-francois-genealogie/data/tree/main/sources/documents) | Scans d'état civil + photos |
| [`referentiels/faits-historiques/`](https://github.com/minier-francois-genealogie/data/tree/main/referentiels/faits-historiques) | Faits historiques (JSON) |
| [`referentiels/dirigeants-france/`](https://github.com/minier-francois-genealogie/data/tree/main/referentiels/dirigeants-france) | Dirigeants France (JSON) |
| [`app/auth/`](https://github.com/minier-francois-genealogie/data/tree/main/app/auth) | Comptes applicatifs |

**Fichiers GEDCOM disponibles** (`sources/gedcom/`) :

| Fichier | Usage |
|---------|-------|
| `fminier.ged` | **Fichier principal** chargé par l'application |
| `fminier-ASC.ged` | Variante ascendants (non utilisée par défaut) |
| `fminier-ASC-new.ged` | Variante ascendants (non utilisée par défaut) |
| `GEDCOM_REF_minierf_Heredis.ged` | Référence Heredis (non utilisée par défaut) |

### Chemins locaux (développement uniquement)

Clone local du dépôt — **données Git uniquement** (pas de scripts) :

- **Racine** : `C:\Projet\Perso\genealogie\github\data\`
- **GEDCOM** : `…\github\data\sources\gedcom\fminier.ged`
- **Documents** : `…\github\data\sources\documents\`
- **Référentiels** : `…\github\data\referentiels\`
- **Auth** : `…\github\data\app\auth\accounts.json`

Les scripts `cursor_ws/` pointent vers ce clone via `paths.py`. En prod, le serveur utilise les URLs GitHub (voir ci-dessous).

Variables d'environnement :

| Variable | Dev (défaut) | Production |
|----------|--------------|------------|
| `GEDCOM_PATH` | `github/data/sources/gedcom/fminier.ged` | Chemin temporaire après fetch, ou URL raw |
| `ACTES_INDEX_PATH` | `github/data/sources/documents` | Non utilisé (listing GitHub) |
| `ACTES_BASE_URL` | — | `https://raw.githubusercontent.com/minier-francois-genealogie/data/main/sources/documents` |
| `DATA_REPO_URL` | — | `https://github.com/minier-francois-genealogie/data.git` |
| `GEDCOM_RAW_URL` | — | `https://raw.githubusercontent.com/minier-francois-genealogie/data/main/sources/gedcom/fminier.ged` |

Constantes centralisées : `cursor_ws/paths.py`.

- Format des lieux dans le GEDCOM : `commune,code postal,département,région,pays` (ex. `Augan,56800,Morbihan,Bretagne,FRANCE`)
- **Souche** : individu racine par défaut de l'arbre ; identifié via la config (`SOUCHE_GEDCOM_ID`, ex. `@655@`)

### Actes d'état civil — répertoire et nommage

Les scans sont organisés en **un dossier par personne** sous `sources/documents/`. La **clé personne** est **sémantique**, **agnostique** du logiciel de généalogie et **indépendante** des id GEDCOM (`@I…@`, instables entre réexportations) et du numéro SOSA (absent pour les collatéraux).

#### Clé personne (nom du dossier)

```text
{NOM}__{prenom1}_{prenom2}_{…}__{AAAA-MM-JJ}__{dept}__{commune}
```

| Segment | Exemple | Description |
|---------|---------|-------------|
| `{NOM}` | `BELLAMY` | Nom de famille (majuscules) |
| `{prenomPrincipal}` | `Joseph_Marie_Jean_Barnabe` | **Tous les prénoms**, séparés par `_` dans le segment |
| `{AAAA-MM-JJ}` | `1805-06-10` | Date de **naissance** (`AAAA-MM-JJ` ; `XXXX-XX-XX` si inconnue) |
| `{dept}` | `56` | Numéro de département de naissance |
| `{commune}` | `Guer` | Commune de naissance (peut contenir des `_`, ex. `La_Gacilly`) |

**Exemple de dossier :** `sources/documents/B/BELLAMY/BELLAMY__Joseph_Marie_Jean_Barnabe__1805-06-10__56__Guer/`

#### Organisation par lettre et nom de famille

Les dossiers sont regroupés sous **`sources/documents/{A-Z}/{NOM}/`**. Le **dossier personne** conserve la **clé complète** (nom inclus) — pas de raccourci.

```text
sources/documents/
  B/
    BELLAMY/
      BELLAMY__Joseph_Marie_Jean_Barnabe__1805-06-10__56__Guer/
      BELLAMY__Marie_Julienne_Josephine_Basilide__1847-06-12__56__La_Gacilly/
    BELLAVOIR/
      BELLAVOIR__Joseph__1791-07-09__35__Bruc_sur_Aff/
  C/
    CHARUEL/
      CHARUEL__Francois__1819-02-05__56__Saint_Laurent/
      CHARUEL__Jean_Marie__1850-02-27__56__Saint_Marcel/
  …
```

Navigation : lettre → nom de famille → personne. Le nom de famille apparaît **deux fois** dans le chemin (regroupement + clé sémantique) — volontaire, pour ne pas changer la convention de parsing du dossier personne.

Tous les **segments** du nom de dossier sont séparés par `__`. À l'intérieur du segment prénoms, les prénoms multiples sont séparés par `_`.

Date de naissance inconnue : utiliser **`XXXX-XX-XX`** — lisible à l'œil nu (contrairement à `0000-00-00` qui ressemble à une vraie date).

#### Normalisation des chemins `sources/documents/` (ASCII)

Les **dossiers et fichiers** sous `sources/documents/` utilisent une orthographe **ASCII sans accents**. Le GEDCOM, SQLite et l'IHM conservent l'**UTF-8 complet** (accents, cédilles, ligatures).

| Couche | Exemple |
|--------|---------|
| GEDCOM / SQLite / affichage | François, Ploërmel, Sérent |
| Chemins `sources/documents/` | `Francois`, `Ploermel`, `Serent` |

**Règles** (appliquées à `{NOM}`, prénoms et `{commune}` dans les chemins) :

1. **Translittération ASCII** — suppression des diacritiques : `éèêë→e`, `àâ→a`, `ç→c`, `ô→o`, `ùûü→u`, `ïî→i`, `œ→oe`, `æ→ae`…
2. **Nom de famille** — ASCII, **majuscules** : `ROUILLÉ` → `ROUILLE`
3. **Prénoms** — ASCII, **Première_Lettre_Majuscule** par prénom, séparés par `_` : `François Xavier` → `Francois_Xavier`
4. **Communes** — ASCII ; **espaces et tirets → `_`** : `Saint-Guyomard` → `Saint_Guyomard`, `La Gacilly` → `La_Gacilly`, `Bruc-sur-Aff` → `Bruc_sur_Aff`
5. **Caractères interdits** — supprimer guillemets, crochets, `" * ? < > | : \ /`
6. **Dates et départements** — inchangés (`1805-06-10`, `56`, `XX`, `XXXX-XX-XX`)

Implémentation de référence : `scripts/act_path_normalize.py`. Tout script créant ou parsant des chemins `sources/documents/` doit l'utiliser.

**Exemple de correspondance :**

```text
GEDCOM (Heredis)     →  chemin sources/documents/
François MINIER      →  MINIER__Francois__…
Ploërmel, Morbihan   →  …__56__Ploermel
Saint-Grégoire       →  …__Saint_Gregoire
```

#### Fichiers d'actes (dans le dossier personne)

```text
{NOM}__{prenom1}_{prenom2}_{…}__{TYPE}__{AAAA-MM-JJ}__{dept}__{commune}[__{suffix}].{ext}
```

| Segment | Exemple | Description |
|---------|---------|-------------|
| `{NOM}__{prénoms}` | `BELLAMY__Joseph_Marie` | Identité complète (autonome si le fichier est déplacé) |
| `{TYPE}` | `N` / `D` / `M` | **N** = naissance, **D** = décès, **M** = mariage |
| `{AAAA-MM-JJ}` | `1805-06-10` | Date de **l'acte** |
| `{dept}` / `{commune}` | `56` / `Guer` | Lieu de **l'acte** |
| `{suffix}` | `COMMUNE`, `GREFFE`… | Optionnel (variantes d'un même acte) |
| `{ext}` | `.jpg`, `.pdf` | Extension obligatoire |

Chaque fichier est **auto-suffisant** : nom et prénoms repris du dossier parent pour rester identifiable hors contexte.

**Exemple complet :**

```text
sources/documents/
  B/BELLAMY/BELLAMY__Joseph_Marie_Jean_Barnabe__1805-06-10__56__Guer/
    BELLAMY__Joseph_Marie_Jean_Barnabe__N__1805-06-10__56__Guer.jpg
    BELLAMY__Joseph_Marie_Jean_Barnabe__M__1846-07-25__56__La_Gacilly.jpg
    BELLAMY__Joseph_Marie_Jean_Barnabe__D__1871-03-16__56__La_Gacilly.jpg
  D/DUPONT/DUPONT__Marie_Anne__1808-04-22__56__Guer/
    DUPONT__Marie_Anne__N__1808-04-22__56__Guer.jpg
    DUPONT__Marie_Anne__M__1850-03-15__56__Guer.jpg
```

#### Photos (dans le dossier personne)

Même arborescence que les actes : un dossier par personne sous `sources/documents/{A-Z}/{NOM}/`, fichiers **à côté** des actes N/M/D.

```text
{NOM}__{prenom1}_{prenom2}_{…}__P__{AAAA-MM-JJ}__{dept}__{commune}__{suffixe}.{ext}
```

| Segment | Exemple | Description |
|---------|---------|-------------|
| `{NOM}__{prénoms}` | `MINIER__Francois_Xavier` | Identité (identique au dossier parent) |
| `{TYPE}` | `P` | **P** = photo de l'individu |
| `{AAAA-MM-JJ}` | `1981-11-03` | Date de **naissance** — **identique** au dossier personne (unicité) |
| `{dept}` / `{commune}` | `56` / `Ploermel` | Lieu de **naissance** — **identique** au dossier personne |
| `{suffixe}` | `Photo_01`, `Portrait`, `Mariage`… | **Libre** : choix de celui qui dépose le fichier dans Git |
| `{ext}` | `.jpg`, `.png` | Extension obligatoire |

La date et le lieu ne décrivent pas la photo elle-même : ce sont ceux de **naissance**, repris tels quels de la **clé du répertoire**, pour garantir l'unicité et le rattachement sans ambiguïté.

**Exemple :**

```text
sources/documents/
  M/MINIER/MINIER__Francois_Xavier__1981-11-03__56__Ploermel/
    MINIER__Francois_Xavier__N__1981-11-03__56__Ploermel.jpg
    MINIER__Francois_Xavier__P__1981-11-03__56__Ploermel__Photo_01.jpg
    MINIER__Francois_Xavier__P__1981-11-03__56__Ploermel__Photo_02.jpg
    MINIER__Francois_Xavier__P__1981-11-03__56__Ploermel__Portrait_enfant.jpg
```

- **Rattachement** : clé personne du dossier parent → `id_gedcom` au re-import.
- **Ordre d'affichage (serveur + IHM)** : tri **alphabétique** sur `{suffixe}` (nom de fichier) — pas de sémantique imposée sur le suffixe.
- **Import** : indexé par `import_actes.py` → table `photos` (même listing GitHub que les actes).

#### Mariage — un dossier par conjoint

L'acte de mariage ne porte que le nom de **l'individu concerné**. Le même scan est en **double exemplaire** : un fichier par conjoint, avec **son** identité dans le nom du fichier.

#### Identifiants — rôles complémentaires

| Niveau | Identifiant | Rôle |
|--------|-------------|------|
| **Fichiers actes** | Clé personne sémantique | Stable, agnostique, lisible dans Git |
| **Application (SQLite)** | Id GEDCOM courant (`@I…@`) | Lien avec le `.ged` du moment ; recalculé à chaque import |
| **Application (arbre)** | Id GEDCOM | Navigation, URL, centrage sur une personne ; parenté via tables `famille_*` |

#### Homonymes

Deux personnes même nom, prénoms, date et commune : ajouter un **prénom distinctif** supplémentaire dans le segment prénoms.

#### Format legacy (v1) — transition

L'ancien format plat (`NOM_prénoms.sosa_XX.date.N.dept-ville`) reste **parsable** par l'application le temps de la migration. Les **nouveaux actes** utilisent exclusivement la convention v2 ci-dessus.

**Import et liaison au GEDCOM :**

1. Au démarrage (ou au rafraîchissement), le serveur **liste** dossiers et fichiers dans `sources/documents/` (local en dev, `git ls-tree` ou API GitHub en prod) — **sans copier les binaires**.
2. Chaque fichier est enregistré dans la table `acts` (clé personne, type, date, département, commune, **URL publique** = `ACTES_BASE_URL` + chemin relatif).
3. **Rattachement à une personne** : la clé personne du dossier est recoupée avec l'événement **naissance** du GEDCOM (nom, prénom principal, date, département, commune) ; pour les actes D et M, correspondance sur le type d'événement, la date et le lieu.
4. **Réexport GEDCOM** (autre outil, nouveaux `@I…@`) : les fichiers actes **ne changent pas** ; le rattachement se refait automatiquement via la clé sémantique.
5. **Plusieurs mariages** : un fichier `M` par union et **par conjoint**. L'IHM propose le choix si plusieurs actes `M` sont rattachés à la même personne.
6. **Icônes IHM** : une icône par type (N, D, M) ; **active** si au moins un scan est rattaché ; clic → modal via **URL GitHub**.
