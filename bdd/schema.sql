-- Schéma SQLite — index généalogique
-- Référence : bdd/SCHEMA_BDD.md
-- Base dérivée, reconstruite à chaque import GEDCOM + actes.
-- version_schema : 10 — mapping professions (nuage)

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Métadonnées d'import (une ligne, id = 1)
-- ---------------------------------------------------------------------------

CREATE TABLE meta (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),
    version_schema      INTEGER NOT NULL,
    id_gedcom_racine    TEXT NOT NULL,
    chemin_gedcom       TEXT,
    empreinte_gedcom    TEXT,
    empreinte_actes     TEXT,
    importe_le          TEXT NOT NULL,
    nb_personnes        INTEGER,
    nb_familles         INTEGER,
    nb_actes            INTEGER,
    nb_photos           INTEGER,
    empreinte_faits     TEXT,
    nb_faits_historiques INTEGER,
    empreinte_dirigeants TEXT,
    nb_dirigeants_france INTEGER
);

-- ---------------------------------------------------------------------------
-- Familles GEDCOM (0 @…@ FAM) — créée avant personnes (FK id_famille_enfant)
-- ---------------------------------------------------------------------------

CREATE TABLE familles (
    id_gedcom   TEXT PRIMARY KEY
);

-- ---------------------------------------------------------------------------
-- Personnes GEDCOM (0 @…@ INDI)
-- ---------------------------------------------------------------------------

CREATE TABLE personnes (
    id_gedcom                       TEXT PRIMARY KEY,
    nom                             TEXT NOT NULL,
    prenoms                         TEXT,
    surnom                          TEXT,
    anecdote                        TEXT,
    sexe                            TEXT CHECK (sexe IN ('M', 'F', 'U')),
    profession                      TEXT,
    id_famille_enfant               TEXT REFERENCES familles (id_gedcom),
    nom_tri                         TEXT,
    texte_recherche                 TEXT,
    date_naissance_min              TEXT,
    date_naissance_min_approximation TEXT CHECK (
        date_naissance_min_approximation IN ('EXACT', 'ENVIRON', 'SUPERIEUR_A')
        OR date_naissance_min_approximation IS NULL
    ),
    date_naissance_min_regle        TEXT,
    date_deces_max                  TEXT,
    date_deces_max_approximation    TEXT CHECK (
        date_deces_max_approximation IN ('EXACT', 'ENVIRON', 'INFERIEUR_A')
        OR date_deces_max_approximation IS NULL
    ),
    date_deces_max_regle            TEXT
);

CREATE INDEX idx_personnes_nom ON personnes (nom);
CREATE INDEX idx_personnes_texte_recherche ON personnes (texte_recherche);
CREATE INDEX idx_personnes_profession ON personnes (profession);

-- ---------------------------------------------------------------------------
-- Parenté
-- ---------------------------------------------------------------------------

CREATE TABLE famille_conjoints (
    id_famille  TEXT NOT NULL REFERENCES familles (id_gedcom),
    id_personne TEXT NOT NULL REFERENCES personnes (id_gedcom),
    role        TEXT NOT NULL CHECK (role IN ('epoux', 'epouse')),
    PRIMARY KEY (id_famille, id_personne)
);

CREATE TABLE famille_enfants (
    id_famille  TEXT NOT NULL REFERENCES familles (id_gedcom),
    id_enfant   TEXT NOT NULL REFERENCES personnes (id_gedcom),
    ordre       INTEGER,
    PRIMARY KEY (id_famille, id_enfant)
);

CREATE INDEX idx_famille_enfants_enfant ON famille_enfants (id_enfant);

CREATE TABLE personne_unions (
    id_personne TEXT NOT NULL REFERENCES personnes (id_gedcom),
    id_famille  TEXT NOT NULL REFERENCES familles (id_gedcom),
    PRIMARY KEY (id_personne, id_famille)
);

-- ---------------------------------------------------------------------------
-- Lieux (cache géocodage)
-- ---------------------------------------------------------------------------

CREATE TABLE lieux (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle_brut        TEXT NOT NULL UNIQUE,
    commune             TEXT,
    code_postal         TEXT,
    departement         TEXT,
    region              TEXT,
    pays                TEXT,
    latitude            REAL,
    longitude           REAL,
    geocode_le          TEXT,
    statut_geocodage    TEXT CHECK (statut_geocodage IN ('ok', 'echec', 'en_attente'))
);

CREATE INDEX idx_lieux_commune ON lieux (commune);
CREATE INDEX idx_lieux_departement ON lieux (departement);

-- ---------------------------------------------------------------------------
-- Événements (naissance, décès, mariage)
-- ---------------------------------------------------------------------------

CREATE TABLE evenements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL CHECK (type IN ('NAISSANCE', 'DECES', 'MARIAGE')),
    id_personne TEXT REFERENCES personnes (id_gedcom),
    id_famille  TEXT REFERENCES familles (id_gedcom),
    id_lieu     INTEGER REFERENCES lieux (id),
    date_brute  TEXT,
    date_iso    TEXT,
    date_tri    TEXT,
    CHECK (
        (type IN ('NAISSANCE', 'DECES') AND id_personne IS NOT NULL AND id_famille IS NULL)
        OR
        (type = 'MARIAGE' AND id_famille IS NOT NULL AND id_personne IS NULL)
    )
);

CREATE INDEX idx_evenements_personne_type ON evenements (id_personne, type);
CREATE INDEX idx_evenements_famille ON evenements (id_famille);

-- ---------------------------------------------------------------------------
-- Actes scannés (métadonnées + URL GitHub)
-- ---------------------------------------------------------------------------

CREATE TABLE actes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL CHECK (type IN ('N', 'M', 'D')),
    cle_personne    TEXT NOT NULL,
    chemin_dossier  TEXT NOT NULL,
    nom_fichier     TEXT NOT NULL,
    chemin_relatif  TEXT NOT NULL UNIQUE,
    url             TEXT NOT NULL,
    date_acte_iso   TEXT,
    departement     TEXT,
    commune         TEXT,
    suffixe         TEXT,
    taille_fichier  INTEGER,
    id_gedcom       TEXT REFERENCES personnes (id_gedcom),
    methode_raccord TEXT CHECK (methode_raccord IN ('cle_naissance', 'date_evenement') OR methode_raccord IS NULL),
    score_raccord   INTEGER
);

CREATE INDEX idx_actes_id_gedcom ON actes (id_gedcom);
CREATE INDEX idx_actes_cle_personne ON actes (cle_personne);
CREATE INDEX idx_actes_type ON actes (id_gedcom, type);

-- ---------------------------------------------------------------------------
-- Photos (métadonnées + URL GitHub, types P et A dans sources/documents/)
-- ---------------------------------------------------------------------------

CREATE TABLE photos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cle_personne    TEXT NOT NULL,
    chemin_dossier  TEXT NOT NULL,
    nom_fichier     TEXT NOT NULL,
    chemin_relatif  TEXT NOT NULL UNIQUE,
    url             TEXT NOT NULL,
    suffixe         TEXT,
    taille_fichier  INTEGER,
    id_gedcom       TEXT REFERENCES personnes (id_gedcom)
);

CREATE INDEX idx_photos_id_gedcom ON photos (id_gedcom);
CREATE INDEX idx_photos_cle_personne ON photos (cle_personne);

-- ---------------------------------------------------------------------------
-- Warnings (GEDCOM vs acte, recalculés à l'import)
-- ---------------------------------------------------------------------------

CREATE TABLE warnings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_gedcom       TEXT NOT NULL REFERENCES personnes (id_gedcom),
    type_evenement  TEXT NOT NULL CHECK (type_evenement IN ('NAISSANCE', 'DECES', 'MARIAGE')),
    id_famille      TEXT NOT NULL DEFAULT '',
    code            TEXT NOT NULL,
    message         TEXT NOT NULL,
    detail          TEXT,
    UNIQUE (id_gedcom, type_evenement, id_famille, code)
);

CREATE INDEX idx_warnings_personne ON warnings (id_gedcom);
CREATE INDEX idx_warnings_type ON warnings (type_evenement);

-- ---------------------------------------------------------------------------
-- Faits historiques (contexte communal → monde)
-- ---------------------------------------------------------------------------

CREATE TABLE commune_slugs (
    slug            TEXT PRIMARY KEY,
    commune         TEXT NOT NULL,
    code_postal     TEXT,
    departement     TEXT,
    region          TEXT,
    pays            TEXT
);

CREATE INDEX idx_commune_slugs_commune ON commune_slugs (commune);

CREATE TABLE faits_historiques (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    niveau          TEXT NOT NULL CHECK (
        niveau IN ('MONDE', 'NATIONAL', 'REGIONAL', 'DEPARTEMENT', 'COMMUNAL')
    ),
    categorie       TEXT NOT NULL,
    debut           TEXT NOT NULL,
    fin             TEXT NOT NULL,
    libelle         TEXT NOT NULL,
    description     TEXT,
    commune         TEXT,
    departement     TEXT,
    region          TEXT,
    pays            TEXT,
    slug            TEXT NOT NULL,
    source_fichier  TEXT NOT NULL
);

CREATE INDEX idx_faits_niveau_slug ON faits_historiques (niveau, slug);
CREATE INDEX idx_faits_debut ON faits_historiques (debut);

-- ---------------------------------------------------------------------------
-- Dirigeants France (rois, empereurs, présidents)
-- ---------------------------------------------------------------------------

CREATE TABLE dirigeants_france (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    nom             TEXT NOT NULL,
    titre           TEXT NOT NULL,
    debut           TEXT NOT NULL,
    fin             TEXT NOT NULL,
    naissance       TEXT,
    deces           TEXT,
    regime          TEXT,
    faits_positifs  TEXT,
    faits_negatifs  TEXT,
    lien_predecesseur TEXT,
    photo_url       TEXT,
    source_fichier  TEXT NOT NULL
);

CREATE INDEX idx_dirigeants_debut ON dirigeants_france (debut);

-- ---------------------------------------------------------------------------
-- Mapping professions (libellé nuage, indépendant du GEDCOM)
-- ---------------------------------------------------------------------------

CREATE TABLE profession_mapping (
    profession_brute TEXT PRIMARY KEY,
    libelle_nuage    TEXT NOT NULL,
    modifie_le       TEXT NOT NULL
);
