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
│   ├── data/               # Nifty 200 universe CSV (nifty200.csv)
│   ├── data_access.py      # Database-to-DataFrame price matrix loader
│   ├── market_data.py      # Yahoo Finance fetcher & Redis/in-memory cache
│   ├── market_routes.py    # Protected /api/stocks and /api/prices endpoints
│   ├── models.py           # SQLAlchemy User, Stock, and Price models
│   ├── scripts/            # Universe loader, price ingestion, and signal CLI
│   ├── server.py           # Flask server and background refresh daemon
│   ├── signals.py          # Pure pandas/numpy momentum signal engine
│   ├── signals_routes.py   # Protected /api/signals endpoint
│   ├── tests/              # pytest test suite
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
- `GET /api/stocks` — Protected endpoint returning active stocks (`symbol`, `name`, `sector`)
- `GET /api/prices/<symbol>?from=YYYY-MM-DD&to=YYYY-MM-DD` — Protected endpoint returning daily adjusted OHLCV bars (defaults to the last 1 year)
- `GET /api/signals?as_of=YYYY-MM-DD&method=vol_adjusted&top=20&lookback=252&skip=21` — Protected endpoint returning momentum scores, rankings, and top selections as of a given date

#### Historical Market Data Ingestion

From `backend/`, populate the Nifty 200 stock universe and download ~6 years of daily adjusted OHLCV history:

```bash
cd backend
python -m scripts.ingest_prices --full
```

Fetch only new trading days after each stock's latest stored date:

```bash
python -m scripts.ingest_prices --incremental
```

You can test with a subset of symbols using `--symbols RELIANCE.NS TCS.NS`.

#### Data Notes

- **Survivorship bias**: `backend/data/nifty200.csv` reflects today's Nifty 200 constituents rather than historical point-in-time index membership, so backtests using this universe are subject to survivorship bias.
- **Adjusted prices**: All daily OHLC prices are downloaded with `yfinance` `auto_adjust=True`, adjusting historical prices for stock splits, bonuses, and dividends so corporate actions do not create artificial price jumps.

#### Signal Methodology

The momentum engine (`backend/signals.py`) ranks the active Nifty 200 universe on any target date using pure vectorized `pandas`/`numpy` operations:

- **Momentum formula**: Trailing return over trading-day positions is computed as `price[as_of - skip_days] / price[as_of - lookback_days] - 1` (default `lookback_days = 252`, `skip_days = 21`, i.e., 12-1 month momentum).
- **Why the most recent month is skipped**: Short-term (1-month / ~21 trading day) returns exhibit mean reversion and microstructure noise; skipping the most recent month isolates intermediate-term trend continuation.
- **Volatility adjustment**: In `vol_adjusted` mode (default), raw momentum is divided by annualised daily return volatility (`std(daily_returns) * sqrt(252)` over the lookback window) so steady trends rank ahead of erratic high-beta spikes with the same return. `raw` mode ranks directly by raw momentum.
- **Eligibility rules**: Stocks must have at least `lookback_days + skip_days` valid trading-day rows strictly before the effective `as_of` date, valid positive prices at both `as_of - skip_days` and `as_of - lookback_days`, and a finite non-NaN score (NaN or zero-volatility scores under `vol_adjusted` are excluded, never filled). Ties in score are broken deterministically by symbol so ranks `1..N` have no duplicates.
- **No-look-ahead guarantee**: All inputs are sliced to rows with `date <= as_of` before any computation; if `as_of` falls on a weekend or market holiday, the last trading day on or before `as_of` is used.

Inspect the latest top 20 rankings from `backend/`:

```bash
cd backend
python -m scripts.show_top --method vol_adjusted
python -m scripts.show_top --method raw
```

#### Backend Tests

```bash
cd backend
pytest
```

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
