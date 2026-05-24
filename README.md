# Yowell — Dashboard jus de fruits

Monorepo pour gérer l'activité d'un business de jus de fruits : statistiques, stock, comptabilité et courses (tournées / livraisons).

## Démarrage

```bash
npm install
npm run dev
```

- **Web** : http://localhost:3000
- **API** : http://localhost:3001/api

API seule :

```bash
cd apps/api && npm run start:dev
```

## Sections du dashboard

| Page | Route | API |
|------|-------|-----|
| Statistiques | `/` | `GET /api/stats/overview` |
| Stock | `/stock` | `GET /api/stock/overview` |
| Comptabilité | `/comptabilite` | `GET /api/accounting/overview` |
| Courses | `/courses` | `GET /api/deliveries/overview` |

## Structure

```txt
apps/
  web/                    # Nuxt — UI minimaliste
    pages/                # une page par section
    layouts/dashboard.vue
    components/
  api/                    # NestJS
    src/stats/
    src/stock/
    src/accounting/
    src/deliveries/       # courses / tournées
packages/
  shared/                 # types TypeScript partagés
```

## Prochaines étapes (partie par partie)

1. **Statistiques** — calculs réels, graphiques
2. **Stock** — CRUD articles, alertes seuil
3. **Comptabilité** — écritures entrée/sortie
4. **Courses** — formulaire tournée + notes détaillées
5. **Base de données** — Prisma + PostgreSQL
