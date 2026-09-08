# Product Review System

A product review system (Amazon/Alza-style): NestJS + PostgreSQL backend,
React + Vite frontend. Built for a CloudTalk take-home assignment. The role
is a Node.js backend engineer focused on system design and SQL query
performance, so this write-up leans into schema/index choices and real
`EXPLAIN ANALYZE` numbers on the two read paths that would be hottest in
production, over feature breadth.

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
4. `cd ../frontend && npm install && cp .env.example .env`
5. `cd ../backend && npm run db:migrate && npm run db:migrate:test` —
   applies migrations to both databases.
6. `npm run seed` — creates demo users/products/reviews (safe to re-run,
   truncates and reseeds). Demo user tokens are fixed (`demo-token-marta`,
   `demo-token-daniel`, `demo-token-ingrid`) and already wired into the
   frontend's user switcher — no need to copy anything.

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

## Demo scenario

1. The user switcher at the top of the page defaults to a signed-in demo
   user (Marta K.) — pick a different one from the dropdown to act as
   someone else, or "— not signed in —" to see the unauthenticated case.
   None of the three demo users has authored a seeded review, so any of
   them can vote or write immediately without hitting the self-vote block
   on their own content.
2. Browse the seeded product's 24 reviews: sort (most recent / highest
   rated), filter by star rating (click a row in the sidebar) or verified
   purchases only, "Load more" for the second page.
3. "Write a review" in the sidebar (the empty-state card offers "Write the
   first review" instead, if there are none yet) opens a form — pick a
   star rating, write a body, optionally a title and a photo URL.
   Submitting updates the rating summary and review list without a page
   reload.
4. Click "Helpful" on any review — the count updates immediately. Voting
   on your own review is blocked with a 403 (write one first, then try);
   a repeat vote from the same user is a no-op, not a double count.

## Tests

- `cd backend && npm test` — unit tests.
- `cd backend && npm run test:e2e` — integration/e2e tests against the real
  `reviews_test` database (needs `docker compose up -d` and migrations
  applied — see Setup). Includes a full-flow test that walks
  open product → write review → see updated rating → vote helpful → see
  the vote reflected on a fresh list read, through the real HTTP stack.
- `cd frontend && npm test` — component/interaction smoke tests (product
  render, empty state, helpful vote happy/error paths, review submission).
- CI (`.github/workflows/ci.yml`) runs all of the above on every push,
  against a fresh Postgres service container — nothing here depends on
  state left over from a local run. The backend job additionally runs
  `format:check`/lint/typecheck; the frontend job additionally runs
  lint/build (its build step typechecks too, via `tsc -b`).

## Query performance benchmarks

Not part of the default setup — opt-in, since a normal first run should
stay fast:

```bash
cd backend
npm run benchmark:seed     # several minutes: ~1,000,000 reviews, 305,000 users, 100 products
npm run benchmark:queries  # prints the plans/timings below
```

`benchmark:seed` is **additive, not part of `npm run seed`**, and refuses
to run twice over its own data (it prints the exact cleanup SQL if you need
to reset and rerun). `npm run seed` truncates everything, including
benchmark data, back to the small demo dataset.

**Environment:** PostgreSQL 16.15 (the project's own Docker container,
`aarch64-unknown-linux-gnu`), host: Apple M3 Pro, 36 GB RAM, macOS. Dataset:
one "hot" product with 300,000 reviews (the one measured below), 99 other
products averaging ~7,071 reviews each, 305,000 distinct users (the hot
product alone needs 300,000 of them, one each, under
`UNIQUE(product_id, user_id)`; the rest is slack, not a requirement). Each
query timing is the min/median of 3
plain runs, measured separately from the `EXPLAIN (ANALYZE, BUFFERS)` pass
below it — `EXPLAIN ANALYZE` adds a `gettimeofday()` call per tuple per plan
node, overhead that's asymmetric across a 300,000-row scan vs. a single-row
lookup and would otherwise be baked into the very comparison this exists to
make. The database was `VACUUM (ANALYZE)`'d after seeding — bare `ANALYZE`
updates planner statistics but not the visibility map a bulk insert leaves
empty, so the plan below would otherwise depend on whether autovacuum had
gotten to it yet.

| Query                                                      | Plan                                    | Median (3 plain runs)    |
| ---------------------------------------------------------- | --------------------------------------- | ------------------------ |
| Naive rating aggregation (`AVG`/`COUNT` over 300k reviews) | Parallel Index Only Scan                | **17.4 ms**              |
| Denormalized rating read (`rating_aggregates` by PK)       | Seq Scan, 1 row out of 102              | **0.3 ms** — ~58x faster |
| Offset pagination, page 1 (`OFFSET 0`)                     | Index Scan                              | 0.3 ms                   |
| Offset pagination, deep page (`OFFSET 100000`)             | Index Scan (scans + discards 100k rows) | **5.4 ms**               |
| Keyset pagination, equivalent deep page                    | Index Scan (seeks directly)             | **0.4 ms** — ~13x faster |

A correctness check runs before trusting the last comparison: the offset
page and the keyset page are asserted to return the exact same 20 row IDs
(they do — `Offset page and keyset page return the same 20 rows: true`).
The keyset cursor is built from the row at `OFFSET 99999` (not `100000`) so
that its strict `<` comparison starts the "equivalent" page at the same row
offset pagination would, not one row late.

<details>
<summary>Full <code>EXPLAIN (ANALYZE, BUFFERS)</code> output</summary>

```
=== Naive rating aggregation (AVG/COUNT over reviews) ===
Finalize Aggregate  (cost=22639.35..22639.36 rows=1 width=40) (actual time=17.512..18.435 rows=1 loops=1)
  Buffers: shared hit=4415 read=1 written=1
  ->  Gather  (cost=22639.13..22639.34 rows=2 width=40) (actual time=17.493..18.431 rows=3 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=4415 read=1 written=1
        ->  Partial Aggregate  (cost=21639.13..21639.14 rows=1 width=40) (actual time=16.724..16.724 rows=1 loops=3)
              Buffers: shared hit=4415 read=1 written=1
              ->  Parallel Index Only Scan using reviews_product_rating_idx on reviews  (cost=0.42..21015.08 rows=124809 width=2) (actual time=0.018..12.905 rows=100000 loops=3)
                    Index Cond: (product_id = '7a979a62-365f-49e8-b440-2f5c7a2fa135'::uuid)
                    Heap Fetches: 0
                    Buffers: shared hit=4415 read=1 written=1
Planning Time: 0.041 ms
Execution Time: 18.449 ms
wall time over 3 plain runs (no EXPLAIN overhead): min 16.5ms, median 17.4ms

=== Denormalized rating read (rating_aggregates by PK) ===
Seq Scan on rating_aggregates  (cost=0.00..3.29 rows=1 width=36) (actual time=0.002..0.004 rows=1 loops=1)
  Filter: (product_id = '7a979a62-365f-49e8-b440-2f5c7a2fa135'::uuid)
  Rows Removed by Filter: 101
  Buffers: shared hit=2
Planning Time: 0.011 ms
Execution Time: 0.007 ms
wall time over 3 plain runs (no EXPLAIN overhead): min 0.3ms, median 0.3ms

=== Offset pagination, page 1 (OFFSET 0) ===
Limit  (cost=0.42..6.08 rows=20 width=122) (actual time=0.002..0.004 rows=20 loops=1)
  Buffers: shared hit=5
  ->  Index Scan using reviews_product_created_idx on reviews  (cost=0.42..84637.12 rows=299542 width=122) (actual time=0.002..0.003 rows=20 loops=1)
        Index Cond: (product_id = '7a979a62-365f-49e8-b440-2f5c7a2fa135'::uuid)
        Buffers: shared hit=5
Planning Time: 0.028 ms
Execution Time: 0.007 ms
wall time over 3 plain runs (no EXPLAIN overhead): min 0.3ms, median 0.3ms

=== Offset pagination, deep page (OFFSET 100000) ===
Limit  (cost=28255.79..28261.44 rows=20 width=122) (actual time=8.428..8.430 rows=20 loops=1)
  Buffers: shared hit=2910
  ->  Index Scan using reviews_product_created_idx on reviews  (cost=0.42..84637.12 rows=299542 width=122) (actual time=0.008..6.442 rows=100020 loops=1)
        Index Cond: (product_id = '7a979a62-365f-49e8-b440-2f5c7a2fa135'::uuid)
        Buffers: shared hit=2910
Planning Time: 0.024 ms
Execution Time: 8.437 ms
wall time over 3 plain runs (no EXPLAIN overhead): min 4.8ms, median 5.4ms

=== Keyset pagination, equivalent deep page ===
Limit  (cost=0.42..23.36 rows=20 width=122) (actual time=0.004..0.005 rows=20 loops=1)
  Buffers: shared hit=4
  ->  Index Scan using reviews_product_created_idx on reviews  (cost=0.42..68263.68 rows=59515 width=122) (actual time=0.003..0.004 rows=20 loops=1)
        Index Cond: ((product_id = '7a979a62-365f-49e8-b440-2f5c7a2fa135'::uuid) AND (ROW(created_at, id) < ROW('2026-09-07 06:30:05.893+00'::timestamp with time zone, 'd0f7ef57-4db6-4e93-9965-69f6d2bdb2a2'::uuid)))
        Buffers: shared hit=4
Planning Time: 0.023 ms
Execution Time: 0.009 ms
wall time over 3 plain runs (no EXPLAIN overhead): min 0.3ms, median 0.4ms

Offset page and keyset page return the same 20 rows: true
```

</details>

## Design decisions

**Layering.** One NestJS service, `Controller → Service → Repository`. The
controller only validates transport shape; the service holds domain logic
and **owns transaction boundaries**; the repository does almost all of the
Drizzle/SQL work, and every write method takes the caller's transaction
handle as a parameter so a service can compose several repository calls
into one atomic unit. A modular monolith, not network-separated services —
at this scale a network hop between "products" and "reviews" would add
latency and failure modes without adding anything real.

**Transactions.** Creating a review touches three tables (`reviews`,
`review_photos`, `rating_aggregates`) and must be atomic; casting a
helpful vote touches two (`review_helpful_votes`, `reviews.helpful_count`).
The service opens the transaction and passes it into every repository call
involved — repositories never open their own connection for a
multi-statement operation. Verified with fault-injection tests: a
repository method is overridden to throw partway through, and the test
asserts every write in that transaction — not just the one that threw —
is gone afterward.

**Denormalized `rating_aggregates`, updated transactionally with every
review.** One row per product (`review_count`, `rating_sum` as an exact
integer — not a pre-divided average, so nothing drifts from rounding
accumulating across many updates — and a `count_1..count_5` breakdown),
created alongside the product itself so its half of `GET /products/:id`
(the other half looks the product up by id or slug) is always a single
primary-key read, never a conditional join for a product with no reviews
yet, and never rescans the reviews table. See the benchmark above for the
actual cost of the naive alternative.

**Keyset pagination, cursor shape matched to the active sort.** Offset
pagination (`LIMIT 20 OFFSET 100000`) scans and discards the first 100,000
matching rows every time — cost grows with page depth on a table that only
grows. The cursor is opaque and base64-encoded; one shaped for a different
`sort` than the one requested (or malformed) is a `400`, not a silent reset
to page 1. Two sort orders (newest, highest-rated) each get a dedicated
index; a verified-only filter uses a partial index on the default order.
"Lowest rated" isn't offered as a sort: a B-tree index scanned backwards
flips every column's direction together, so serving it well would need its
own, mostly-redundant index for a rarely-used option.

**Reviews and their photos are two separate queries**, not one join — a
one-to-many join directly into the paginated review query would multiply
rows for any review with more than one photo and break the page-size
`LIMIT`. Photos are fetched second, keyed by the page's review IDs, via
`WHERE review_id = ANY(...)` — backed by an index on `review_photos.
review_id` (migration `0002`; Postgres doesn't index foreign-key columns
automatically, so without it that lookup would scan the whole photos
table on every page). The migration uses a plain `CREATE INDEX`, not
`CREATE INDEX CONCURRENTLY`: this project's migrator wraps each migration
in a transaction, where `CONCURRENTLY` isn't legal — the right tool for a
genuinely live table would be a one-off script running that statement
outside the normal migration transaction. The same photos-vs-join
reasoning is why the author-name field _is_ a plain join (added during a
later visual-fidelity pass): reviews→users is many-to-one, so it can't
multiply rows the way reviews→photos could.

**Idempotent helpful voting.** `PRIMARY KEY(review_id, user_id)` on
`review_helpful_votes` is the source of truth for "already voted" — an
`ON CONFLICT DO NOTHING` insert, not a check-then-insert, which would race
under concurrent requests. Verified with a concurrency test: two parallel
votes from the same user increment the count exactly once, not twice and
not zero times depending on timing.

**No Redis, no queue.** After denormalization, the rating-summary read is
already a single indexed row — there's nothing expensive left to cache,
and Redis can't join the Postgres transaction, so "invalidate atomically"
wouldn't actually be atomic. A queue for async aggregate recomputation
doesn't remove the real constraint either (row-level write contention on
one popular product's aggregate row under concurrent reviews serializes
either way) — it would only decouple review-insert latency from
aggregate-update latency, at the cost of a second correctness problem
(dual write to DB + broker, delivery retries, idempotency) not worth
taking on here.

**Minimal auth**: seeded users, each with a static bearer token. Enough to
make authorization real — one review and one vote per user, review
authorship, verified-purchase lookup against `orders` — without building
login/session infrastructure this take-home isn't evaluating.

**Frontend**: a two-column layout (sticky rating-summary sidebar, review
list) once a product has reviews; a centered empty state when it doesn't.
Write-a-review is a modal with keyboard focus trapping, Escape-to-close,
and focus restored to whatever was focused before it opened. Photos are a
URL text input, not an upload — see "No real photo upload" below.

## Known limitations / extension points

- **No real photo upload** — a review stores photo URLs, not uploaded
  files. Extension point: `review_photos.url` already models this; adding
  real storage means a signed-upload endpoint plus a mime/size check ahead
  of it, not a schema change.
- **No product catalog/listing endpoint** — the frontend points at one
  seeded demo product (`VITE_DEMO_PRODUCT_SLUG`). `GET /products/:id`
  already accepts either a UUID or a slug, so a listing endpoint would
  slot in beside it without changing the detail route.
- **No async aggregate recompute, cache, or moderation.** See "Design
  decisions" above for why caching/queueing weren't worth it _yet_ — both
  remain reasonable additions once read traffic or write volume actually
  justifies the added complexity (cache-aside Redis around the rating
  summary; a queue for aggregate recomputation, once row-level contention
  on the aggregate — not review-insert latency — is the thing needing to
  move off the write path).
- **No real login** — a demo user switcher swaps between three fixed
  bearer tokens. Real auth (OAuth/sessions) is additive: the rest of the
  system already keys everything off `req.user.id` from the token, not
  off any assumption about how that identity was established.
- **Splitting `reviews` into its own service** is a real architectural
  change if it's ever needed, not a transport swap — it currently shares a
  transaction with `rating_aggregates` and reads `orders` for
  verified-purchase checks, both of which would need a different
  consistency story once those two things run in different processes.
