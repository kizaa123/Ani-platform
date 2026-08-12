# ConcordiaOrbis Agricultural Exchange Platform

Production-ready agricultural marketplace connecting **farmers**, **buyers**, and **agents** across Ghana.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (3000)                   │
│  Landing · Register · Dashboards · Marketplace · Chat        │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api (JWT)
┌──────────────────────────▼──────────────────────────────────┐
│              Express API — Clean Architecture (3001)         │
│  Routes → Controllers → Services → Prisma → PostgreSQL       │
│  Middleware: Auth · RBAC · Access Control · Audit · Validate   │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   PostgreSQL        Payment Provider    AI Services (stubs)
   (Prisma ORM)      (abstracted)        matching · assistant
```

### Layers

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP endpoints, middleware chain |
| **Controllers** | Request/response handling |
| **Services** | Business logic, transactions |
| **Middleware** | Auth, RBAC, buyer access gates, validation |
| **AI** | Isolated stubs ready for embeddings, LLM, ML |

### User Roles (RBAC)

1. Crop Farmer · 2. Livestock Farmer · 3. Farmer Handler · 4. Buyer · 5. Buyer Handler · 6. ConcordiaOrbis Accountant · 7. Admin

### Data Visibility

**Before payment:** profile picture, name, commodity category, region  
**After payment:** phone, farm details, quantities, images, contact, connections

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### 1. Database (SQLite — no Docker needed)

The project uses **SQLite** locally so you don't need PostgreSQL or Docker.

```bash
cd backend
npm install
copy .env.example .env
npm run db:setup
```

> **Important:** Stop the backend (`Ctrl+C`) before running `db:setup` if it's already running.

### Optional: PostgreSQL via Docker

```bash
docker compose up -d
```

Change `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL` in `.env`, then run `npm run db:setup`.

API: http://localhost:3001/api/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Demo Accounts

Password for all: `Password123!`

| Email | Role |
|-------|------|
| kwame@farm.gh | Crop Farmer |
| ama@buyer.gh | Buyer |
| yaw@handler.gh | Farmer Handler |
| kofi@handler.gh | Buyer Handler |
| accountant@ani.gh | ConcordiaOrbis Accountant |
| admin@ani.gh | Admin |

## Project Structure

```
ANI PLATFORM/
├── backend/
│   ├── prisma/schema.prisma    # Full PostgreSQL schema
│   ├── prisma/seed.ts          # Roles, permissions, commodities
│   └── src/
│       ├── controllers/        # HTTP handlers
│       ├── services/           # Business logic + payment provider
│       ├── middleware/         # Auth, RBAC, access control
│       ├── routes/             # API route definitions
│       ├── ai/                 # AI service stubs
│       ├── database/           # Prisma client
│       └── utils/              # JWT, password, errors
├── frontend/                   # Next.js + Tailwind
└── docker-compose.yml
```

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST `/auth/register`, `/auth/login`, GET `/auth/me` |
| Commodities | GET `/commodities`, `/commodities/categories` |
| Farm | GET/PUT `/farm/profile`, CRUD `/farm/commodities` |
| Marketplace | GET/POST `/marketplace` (access-gated visibility) |
| Payments | GET `/payments/packages`, POST `/payments/purchase` |
| Connections | GET/POST `/connections`, PATCH status |
| Messages | GET/POST `/messages` |
| Agents | GET/POST `/agents/assignments` |
| Admin | GET `/admin/stats`, verify users, audit logs |
| AI | GET `/ai/matches`, POST `/ai/assistant` (stubs) |

## Security

- JWT + refresh tokens
- bcrypt password hashing (12 rounds)
- Role-based permissions on every protected route
- Rate limiting (300 req / 15 min)
- Helmet security headers
- Audit logging
- Buyer access payment gate before full farmer data

## Payment Provider

The `PaymentProvider` interface in `backend/src/services/payment.provider.ts` abstracts payment gateways. Swap `MockPaymentProvider` for Paystack, Stripe, or MTN MoMo in production.

## Deployment (Vercel + Render)

| Part | Host | Config |
|------|------|--------|
| Frontend (Next.js) | **Vercel** | Root directory: `frontend` |
| Backend (API) | **Render** | `render.yaml` → `concordiaorbis-api` |
| Database | **Render Postgres** | `ani-platform-db` |

### 1. Render (backend only)

1. Push to GitHub, then Render Dashboard → Blueprints → **Manual Sync**.
2. API URL: `https://concordiaorbis-api.onrender.com`
3. Set in Render → **concordiaorbis-api** → **Environment**:
   ```
   FRONTEND_URL=https://YOUR-APP.vercel.app
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
4. Test: `https://concordiaorbis-api.onrender.com/api/health`

### Replace a broken `ani-platform-api` service

If the old API service errors and you want it gone:

1. **Create the new API** — push this repo, then Render → Blueprints → **Manual Sync**  
   (creates `concordiaorbis-api`, keeps database `ani-platform-db`).
2. **Copy env vars** from the old service to `concordiaorbis-api` (especially `DATABASE_URL`, JWT, Cloudinary, Google, `FRONTEND_URL`).
3. **Test** `https://concordiaorbis-api.onrender.com/api/health`.
4. **Update Vercel** `BACKEND_URL` and `NEXT_PUBLIC_API_URL` to the new URL → Redeploy.
5. **Delete** the old `ani-platform-api` service: Render → that service → **Settings** → scroll down → **Delete Web Service**.

Do **not** delete `ani-platform-db` unless you intend to wipe all data.

### 2. Vercel (frontend)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. **Root Directory:** `frontend`
3. **Framework:** Next.js (auto-detected)
4. Set **Environment Variables** (Production):
   ```
   BACKEND_URL=https://concordiaorbis-api.onrender.com
   NEXT_PUBLIC_SITE_URL=https://YOUR-APP.vercel.app
   NEXT_PUBLIC_API_URL=https://concordiaorbis-api.onrender.com
   NEXT_PUBLIC_GOOGLE_DEV_MODE=false
   ```
5. Deploy. Your site URL is the Vercel domain (or add a custom domain in Vercel → Domains).

`next.config.ts` proxies `/api/*` to `BACKEND_URL`, so the browser stays on your Vercel URL.

### 3. Google OAuth

Add authorized redirect URI:
```
https://concordiaorbis-api.onrender.com/api/auth/google/callback
```

Add authorized JavaScript origin:
```
https://YOUR-APP.vercel.app
```

See `backend/.env.example` and `frontend/.env.example` for local development.

## License

Proprietary — ConcordiaOrbis
