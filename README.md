# Product Review System

A product review system (Amazon/Alza-style): NestJS + PostgreSQL backend,
React + Vite frontend. Built for a CloudTalk take-home assignment.

## Requirements

- Node.js >= 22.12 (this project was built and tested on Node 24 — see
  `.nvmrc`; run `nvm use` if you have nvm installed)
- Docker (for local PostgreSQL)

## Setup

1. `docker compose up -d` — starts PostgreSQL with two databases: `reviews`
   (dev/demo data) and `reviews_test` (test suite). These are created by
   `docker/init-test-db.sql`, which only runs the **first** time the
   `pg-data` volume is created — if you already had this container running
   from before that file existed, `reviews_test` won't exist. Fix without
   touching `reviews`'s dev data:
   ```bash
   docker compose exec postgres psql -U reviews -d reviews \
     -c "CREATE DATABASE reviews_test;"
   ```
2. `cp .env.example .env`
3. `cd backend && npm install`
4. `cd ../frontend && npm install`

(Migration and seed commands are added as they land, in a later commit.)

## Running it

In one terminal:

```bash
cd backend
npm run start:dev
```

Verify it's up: `curl http://localhost:4001/health` → `{"status":"ok"}`
(port is `.env`'s `PORT`).

In another terminal:

```bash
cd frontend
npm run dev
```

Open the URL it prints (`http://localhost:5173` by default).

## Design

See [`docs/design.md`](docs/design.md) for the full design: schema,
indexing, transaction boundaries, and the trade-offs behind them.
