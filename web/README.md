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

## Fonctionnalités (MVP)

- **Arbre généalogique** — ancêtres/descendants configurables, clic pour recentrer
- **Navigation clavier** — ↑↓ parents/enfants, ←→ fratrie, Home = souche
- **Fiche personne** — événements, relations, photos
- **Actes** — icônes N/M/D, modal plein écran (images + PDF)
- **Recherche** — nom, prénom, profession, pagination
- **Rafraîchir** — bouton ↻ (POST `/api/rafraichir`)

## À venir

- Carte Leaflet (lieux de naissance)
- Filtres avancés (département, période, sexe)
- Déploiement static site (Render / Netlify)
