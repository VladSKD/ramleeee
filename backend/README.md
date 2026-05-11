# RAMLE Backend (Express, pure JS)

Hybrid companion to the Lovable Cloud (Supabase) frontend. Handles:

- **GDPR**: `GET /api/gdpr/export`, `DELETE /api/gdpr/delete`
- **External integrations**: `GET /api/external-service`
- **JWT verification** of Supabase user tokens

> Cloudflare Workers (the Lovable hosting runtime) does not run Express.
> Deploy this service separately on Render / Railway / Fly.io / a VPS.

## Setup

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev
```

Required env vars (see `.env.example`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — used to verify user JWTs
- `SUPABASE_SERVICE_ROLE_KEY` — required for cascading deletes & auth.admin
- `CORS_ORIGIN` — e.g. `http://localhost:5173,https://your.app`

## Calling from the frontend

```ts
import { supabase } from "@/lib/supabase";

const { data: { session } } = await supabase.auth.getSession();

const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gdpr/export`, {
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

## Endpoints

| Method | Path                      | Auth | Purpose                                    |
|--------|---------------------------|------|--------------------------------------------|
| GET    | `/health`                 | —    | Liveness probe                             |
| GET    | `/api/external-service`   | ✅   | Authenticated proxy to a 3rd-party API     |
| GET    | `/api/gdpr/export`        | ✅   | GDPR Art.15/20 — user data export (JSON)   |
| DELETE | `/api/gdpr/delete`        | ✅   | GDPR Art.17 — full account erasure         |

## Architecture

- `src/server.js` — Express bootstrap, CORS, logging, route mounting
- `src/supabaseClients.js` — `supabaseAuth` (anon, JWT verify) + `supabaseAdmin` (service role, RLS bypass)
- `src/middleware/requireAuth.js` — `Authorization: Bearer` → `req.user_id`
- `src/routes/gdpr.js` — export & delete
- `src/routes/externalService.js` — example protected proxy