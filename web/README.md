# IHM Gwriziou

Interface web React pour l'API généalogie (`gwriziou-api`).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4 (mobile-first)
- React Router — URL `/tree?id=@655@`
- PWA (manifest + service worker via `vite-plugin-pwa`)

## Prérequis

- Node.js 20+
- API locale sur le port 8000 (ou URL prod via `VITE_API_URL`)

## Développement

```powershell
cd web
npm install
npm run dev
```

→ http://127.0.0.1:5173 — le proxy Vite redirige `/api/*` vers `http://127.0.0.1:8000`.

## Build production

```powershell
npm run build
npm run preview
```

Variable d'environnement pour pointer vers l'API déployée :

```powershell
$env:VITE_API_URL = "https://gwriziou-api.onrender.com"
npm run build
```

(`VITE_*` est injecté au build — pas modifiable après coup sans rebuild.)

## Déploiement

Repo : [github.com/minier-francois-genealogie/gwriziou/web](https://github.com/minier-francois-genealogie/gwriziou/tree/main/web)

### Render (recommandé)

Le fichier `render.yaml` à la racine du monorepo déclare **gwriziou-api** (Docker) et **gwriziou** (static).

1. Render → **New** → **Blueprint** → repo `minier-francois-genealogie/gwriziou`
2. Le site static build depuis `web/` avec `VITE_API_URL` pointant vers l'API
3. Le rewrite SPA (`/* → /index.html`) est configuré dans le blueprint

**Anti veille Render :** le self-ping est géré par l'API (`gwriziou-api`), pas par l'IHM. Aucune config supplémentaire sur le site static. Voir `server/README.md` (section *Self-ping*).

Déploiement manuel (sans blueprint) : **Static Site**, root `web`, publish `dist`, variable `VITE_API_URL`.

### Netlify

Root directory `web` — `netlify.toml` et `public/_redirects` gèrent build + routing SPA.

### Fichiers utiles

| Fichier | Rôle |
|---------|------|
| `public/_redirects` | Fallback SPA (Netlify, Render) |
| `netlify.toml` | Build Netlify depuis `web/` |
| `.env.example` | Modèle `VITE_API_URL` |

## Fonctionnalités (MVP)

- **Application installable (PWA)** — plein écran via « Installer » (Chrome/Android) ou « Sur l’écran d’accueil » (iPhone/iPad)
- **Mode paysage sur mobile** — écran « Tournez votre appareil » en portrait (téléphone / tablette) ; le manifeste n’impose plus `orientation: landscape` (problématique au lancement Android)

- **Arbre généalogique** — ancêtres/descendants configurables, clic pour recentrer
- **Navigation clavier** — ↑↓ parents/enfants, ←→ fratrie, Home = souche
- **Fiche personne** — événements, relations, photos
- **Actes** — icônes N/M/D, modal plein écran (images + PDF)
- **Recherche** — nom, prénom, profession, pagination
- **Rafraîchir** — bouton ↻ (POST `/api/rafraichir`)

## À venir

- Carte Leaflet (lieux de naissance)
- Filtres avancés (département, période, sexe)
