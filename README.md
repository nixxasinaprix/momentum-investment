# Momentum Investment

A full-stack investment platform landing page and authentication portal featuring live NSE (NIFTY 500) market insights, top gainers/losers, and Redis-backed caching with an automatic in-memory fallback.

## Project Structure

```text
├── frontend/               # React + Vite + Tailwind CSS client
│   ├── public/
│   ├── src/
│   │   ├── components/     # Animated shader/scenery backgrounds
│   │   └── pages/          # LandingPage and LoginPage
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── backend/                # Flask API & NSE market data worker
│   ├── auth.py             # JWT authentication blueprint & login_required
│   ├── market_data.py      # Yahoo Finance fetcher & Redis/in-memory cache
│   ├── models.py           # SQLAlchemy User model
│   ├── server.py           # Flask server and background refresh daemon
│   ├── .env.example
│   └── requirements.txt
└── .gitignore
```

## Prerequisites

- **Node.js** (v18+ recommended) and **npm**
- **Python** 3.10+
- **Redis** (optional — the backend automatically falls back to an in-memory cache if Redis is unavailable)

## Setup & Running Locally

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit backend/.env and set a random JWT_SECRET (for example: python -c "import secrets; print(secrets.token_hex(32))")
python server.py
```

#### Backend Environment Variables (`backend/.env`)

- `JWT_SECRET` (required) — Secret key used to sign HS256 JWT tokens (`24h` expiry)
- `DATABASE_URL` (optional, defaults to `sqlite:///momentum.db`) — SQLAlchemy database connection string

The API server runs on `http://localhost:8000` by default and exposes:
- `GET /` — API status and links
- `GET /api/nifty500` — NIFTY 500 index summary
- `GET /api/nifty500-details` — Index summary plus NSE top 5 gainers and losers
- `GET /api/cache-status` — Active cache mode (`redis` or `in-memory`) and TTL
- `POST /api/auth/signup` — Register with `{ email, password }` (returns `201` `{ token, user }`)
- `POST /api/auth/login` — Sign in with `{ email, password }` (returns `200` `{ token, user }`)
- `GET /api/auth/me` — Protected endpoint requiring `Authorization: Bearer <token>` (returns `200` `{ user }`)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` if your backend runs on a non-default URL (defaults to `http://localhost:8000`).

### Build & Lint

```bash
cd frontend
npm run lint
npm run build
```
