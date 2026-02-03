# Backend for Farmer Aid

This folder contains a small Express server that proxies Open-Meteo and a generative AI endpoint.

Quick start

1. Copy `.env.example` to `.env` and fill in keys (e.g. `GEMINI_API_URL` and `GEMINI_API_KEY`). Optionally set `FRONTEND_API_KEY` to require the frontend to send `x-api-key`.

2. Install dependencies (already done in this workspace):

```powershell
cd backend
npm install
```

3. Start server:

```powershell
node server.js
# or for development (auto-reload):
npx nodemon server.js
```

API endpoints

- `GET /api/health` — health check
- `GET /api/geocode?name=...` — proxies Open-Meteo geocoding
- `GET /api/weather?latitude=...&longitude=...` — proxies Open-Meteo weather
- `POST /api/gemini` — forward AI generation requests. Accepts either the full Gemini request body or shorthand `{ prompt, generationConfig }`.

Security

- Rate limiting is applied to `/api/gemini`.
- Optionally set `FRONTEND_API_KEY` in `.env` and send `x-api-key` header from frontend to protect the AI proxy.
