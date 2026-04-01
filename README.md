# Market Dashboard

A real-time stock market monitoring dashboard built with React, Express, and Yahoo Finance data. Tracks Nasdaq/S&P 500 with IBD-style market signals including Follow-Through Day detection, Power Trend analysis, distribution day counts, and breadth indicators.

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen)

## Features

- **Ticker Strip** — Live prices for Nasdaq, S&P 500, VIX, DXY, TLT, JNK, USO, DBA, GLD
- **Primary Signals** — MA Alignment, VIX regime, Follow-Through Day, Power Trend
- **Follow-Through Day Engine** — Full IBD canonical definition with state machine (correction → rally → confirmed), 10% drawdown threshold, invalidation floor, and negation rules
- **Power Trend Conditions** — 4 sub-conditions tracked individually (10d low > 21 EMA, 21 EMA > 50 SMA, 50 SMA trending up, close > 21 EMA)
- **Moving Averages** — 10 EMA, 21 EMA, 50 SMA, 200 SMA with % above/below
- **Market Health & Breadth** — Distribution days, Nasdaq A/D ratio, Net New Highs/Lows, volume vs 50-day average
- **Market School Summary** — Composite BULLISH / NEUTRAL / CAUTION score
- **Dark Mode** — Enabled by default

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Express + Node.js
- **Data Sources:** Yahoo Finance (yahoo-finance2), Barchart API (new highs/lows)
- **Build:** Vite + esbuild

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- npm (comes with Node.js)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/market-dashboard.git
cd market-dashboard

# Install dependencies
npm install

# Start development server (hot reload)
npm run dev
```

The dashboard will be available at **http://localhost:5000**

### Production Build

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

## Project Structure

```
market-dashboard/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Dashboard UI components
│   │   │   ├── MarketHealthCards.tsx
│   │   │   ├── MovingAveragesCards.tsx
│   │   │   ├── PowerTrendCards.tsx
│   │   │   ├── PrimarySignals.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   ├── TickerStrip.tsx
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/
│   │   │   └── Dashboard.tsx  # Main dashboard page
│   │   ├── App.tsx
│   │   └── index.css          # Theme & dark mode
│   └── index.html
├── server/
│   ├── marketEngine.ts        # Core engine: data fetching, MAs, FTD, signals
│   ├── routes.ts              # API routes
│   ├── index.ts               # Express server entry
│   └── data/                  # Cached CSV data (fallback)
├── shared/
│   └── schema.ts              # TypeScript interfaces
├── net-highs-lows-cache.json  # Persistent cache for weekend/after-hours data
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## API

The server exposes a single API endpoint:

```
GET /api/dashboard
```

Returns all dashboard data as JSON, cached for 60 seconds.

## Data Sources

| Data | Source | Notes |
|------|--------|-------|
| Quotes (9 tickers) | Yahoo Finance | Real-time via `yahoo-finance2` |
| OHLCV History | Yahoo Finance | 300 trading days for Nasdaq & S&P 500 |
| Nasdaq A/D Ratio | Yahoo Finance | `C:ISSQ` quote (dayHigh=advancing, dayLow=declining) |
| Nasdaq Net Highs/Lows | Barchart API | 52-week highs/lows; disk-cached for weekends |
| Moving Averages | Computed | 10 EMA, 21 EMA, 50 SMA, 200 SMA from history |

## Hosting Options

### Run Locally
Just `npm run dev` — great for personal use.

### Deploy to a VPS (DigitalOcean, Linode, etc.)
```bash
npm run build
NODE_ENV=production node dist/index.cjs
```
Put behind nginx with a reverse proxy to port 5000.

### Deploy to Railway / Render / Fly.io
These platforms auto-detect Node.js apps. Set the start command to:
```
npm run build && NODE_ENV=production node dist/index.cjs
```

## License

MIT
