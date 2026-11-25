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
│   ├── market_data.py      # Yahoo Finance fetcher & Redis/in-memory cache
│   ├── server.py           # Flask server and background refresh daemon
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
python server.py
```

The API server runs on `http://localhost:8000` by default and exposes:
- `GET /` — API status and links
- `GET /api/nifty500` — NIFTY 500 index summary
- `GET /api/nifty500-details` — Index summary plus NSE top 5 gainers and losers
- `GET /api/cache-status` — Active cache mode (`redis` or `in-memory`) and TTL

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
