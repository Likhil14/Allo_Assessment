# AlloStock — Healthcare Inventory Reservation System

A production-quality reservation-based inventory management system built for Allo Health's take-home engineering assessment. Built with Next.js 15 App Router, Prisma, PostgreSQL, and Redis — with a strong emphasis on correctness under concurrency.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [Concurrency Explanation](#concurrency-explanation)
- [Reservation Expiry](#reservation-expiry)
- [Idempotency](#idempotency)
- [API Reference](#api-reference)
- [Trade-offs & Design Decisions](#trade-offs--design-decisions)
- [Future Improvements](#future-improvements)
- [Git Commit Strategy](#git-commit-strategy)
- [Testing Strategy](#testing-strategy)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  React Pages │    │ API Routes   │    │  Cron Handler    │  │
│  │  (App Router)│    │ /api/*       │    │  /api/cron/*     │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                     │             │
│         │            ┌──────▼───────┐             │             │
│         │            │  Services    │◄────────────┘             │
│         │            │  (Business   │                           │
│         │            │   Logic)     │                           │
│         │            └──────┬───────┘                           │
│         │                   │                                   │
│         │            ┌──────▼───────┐                           │
│         │            │ Repositories │                           │
│         │            │ (Data Layer) │                           │
│         │            └──────┬───────┘                           │
└─────────┼───────────────────┼───────────────────────────────────┘
          │                   │
    ┌─────▼──────┐     ┌──────▼──────────┐    ┌──────────────┐
    │ React Query│     │  PostgreSQL      │    │ Upstash Redis│
    │ (Client    │     │  (via Prisma)    │    │ (Idempotency)│
    │  Cache)    │     │                 │    │              │
    └────────────┘     └─────────────────┘    └──────────────┘
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| **Pages** | `app/` | Routing, layout, SSR |
| **Components** | `components/` | UI rendering, user interactions |
| **Hooks** | `hooks/` | Data fetching (React Query), derived state |
| **API Routes** | `app/api/` | HTTP handling, validation, response formatting |
| **Services** | `services/` | Business logic, transaction orchestration |
| **Repositories** | `repositories/` | Prisma queries — single source of DB truth |
| **Lib** | `lib/` | Shared utilities (Prisma client, Redis, response helpers) |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase / Neon) |
| Cache / Idempotency | Upstash Redis (HTTP-based, serverless-safe) |
| UI | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Data Fetching | TanStack React Query v5 |
| Notifications | Sonner |
| Local Dev DB | Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL) or a Supabase / Neon database URL

### 1. Clone and install

```bash
git clone https://github.com/yourname/allo-inventory.git
cd allo-inventory
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in DATABASE_URL (and optionally Redis vars)
```

### 3. Start local database (optional)

```bash
docker compose up -d
# DATABASE_URL for Docker: postgresql://allo:allo_dev_password@localhost:5432/allo_inventory
```

### 4. Run migrations and seed

```bash
npm run db:generate   # Generate Prisma Client
npm run db:push       # Push schema to DB (dev)
npm run db:seed       # Seed with demo data
```

### 5. Start dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL (e.g. `https://your-app.vercel.app`) |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis endpoint for idempotency |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis auth token |
| `CRON_SECRET` | ✅ (prod) | Bearer token protecting cron routes |

---

## Database Setup

### Supabase (Recommended for deployment)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection String → URI**
3. Copy the URI into `DATABASE_URL`
4. Run: `npm run db:migrate` (production-grade — creates migration files)

### Neon (Alternative serverless Postgres)

1. Create a database at [neon.tech](https://neon.tech)
2. Copy the connection string (with `?sslmode=require`)
3. Run `npm run db:push` for rapid iteration, or `npm run db:migrate` for production

### Migration commands

```bash
# Development — apply schema changes without a migration file
npm run db:push

# Production — create and apply a tracked migration
npm run db:migrate

# Seed demo data
npm run db:seed

# Open Prisma Studio (DB browser)
npm run db:studio

# Full reset (dev only)
npm run db:reset
```

---

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables in the Vercel dashboard
4. Vercel auto-detects Next.js — deploy

The `vercel.json` configures a cron job to expire reservations every 5 minutes:

```json
{
  "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "*/5 * * * *" }]
}
```

The cron route is protected by `Authorization: Bearer $CRON_SECRET`.

### Upstash Redis Setup

1. Create a database at [upstash.com](https://upstash.com/redis)
2. Select **REST API** mode (required for serverless)
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## Concurrency Explanation

### The Problem

Two users simultaneously request the last unit of a product:

```
User A: read availableUnits = 1 → OK, reserve!
User B: read availableUnits = 1 → OK, reserve!
User A: UPDATE reservedUnits += 1 → reservedUnits = 2 (but total = 1) ❌
User B: UPDATE reservedUnits += 1 → oversold!
```

### The Solution: `SELECT FOR UPDATE` inside a Transaction

```sql
BEGIN;
SELECT id, "totalUnits", "reservedUnits", version
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;          ← acquires exclusive row lock
-- User B's request BLOCKS here until User A's transaction commits
-- After User A commits: reservedUnits = 1, availableUnits = 0
-- User B now reads updated state → insufficient stock → 409
```

**Why this approach:**

| Approach | Pros | Cons |
|---|---|---|
| `SELECT FOR UPDATE` (chosen) | Deterministic first-writer-wins, simple error handling, no client retries | Lock contention under very high load |
| Optimistic locking (version CAS) | No blocking, good for low contention | Requires application retry loops; bad UX for checkout |
| `SERIALIZABLE` isolation | Maximum safety | Most transaction rollbacks, complex retry needed |

For a **checkout flow**, `SELECT FOR UPDATE` gives the best developer experience and user experience: exactly one request succeeds, one gets a clear 409, no retry complexity exposed to the client.

### Code Location

`services/reservation.service.ts` → `create()` method  
`repositories/reservation.repository.ts` → `lockInventoryForUpdate()`

---

## Reservation Expiry

### Strategy: Cron + Lazy Expiry (Hybrid)

**Lazy expiry** (on access): When `POST /reservations/:id/confirm` is called on an expired reservation, it's marked `EXPIRED` and inventory is released in the same transaction. This catches the most important case — the user is on the checkout page.

**Cron cleanup** (proactive): Vercel Cron calls `GET /api/cron/expire-reservations` every 5 minutes. This finds all `PENDING` reservations where `expiresAt < NOW()`, releases their inventory, and marks them `EXPIRED`.

**Why not a persistent background worker?** Vercel is serverless — no long-running processes. Crons are the idiomatic serverless solution.

**Trade-off:** Between cron runs (up to 5 minutes), expired reservations still hold inventory. This is acceptable given a 15-minute TTL. For tighter SLAs, switch to Inngest or QStash for event-driven expiry.

### Reservation TTL

15 minutes — standard for e-commerce checkout flows. Configurable in `services/reservation.service.ts` (`RESERVATION_TTL_MINUTES`).

---

## Idempotency

Network failures cause clients to retry requests. Without idempotency, a retry of `POST /reservations` creates a duplicate reservation.

### Implementation

1. Client sends `Idempotency-Key: <uuid>` header
2. Server checks Redis for `idempotency:<route>:<key>`
3. **Hit** → return cached response (with `Idempotent-Replayed: true` header)
4. **Miss** → process normally, cache `{status, body}` for 24 hours

Redis is used (not PostgreSQL) because:
- Sub-millisecond lookup vs ~5ms DB round-trip
- Native TTL — no cleanup needed
- Decoupled from transactional writes

**Fallback:** If Redis is unavailable, idempotency is silently skipped. The app remains functional — retries may create duplicates, but correctness (no overselling) is preserved by the `FOR UPDATE` lock.

---

## API Reference

### `GET /api/products`

Returns all products with stock per warehouse.

```json
{
  "success": true,
  "data": [
    {
      "id": "clxyz...",
      "name": "Ozempic (Semaglutide) 0.5mg",
      "sku": "MED-OZEM-01",
      "price": "14999.00",
      "totalAvailable": 12,
      "inventory": [
        {
          "warehouseId": "wh_mumbai",
          "totalUnits": 3,
          "reservedUnits": 1,
          "availableUnits": 2,
          "warehouse": { "name": "Mumbai Central", "location": "Mumbai, Maharashtra" }
        }
      ]
    }
  ]
}
```

### `POST /api/reservations`

```json
// Request
{ "productId": "clxyz...", "warehouseId": "wh_mumbai", "quantity": 2 }

// 201 Created
{ "success": true, "data": { "id": "clres...", "status": "PENDING", "expiresAt": "..." } }

// 409 Conflict (insufficient stock)
{ "success": false, "error": "Insufficient stock. Requested 2, available 1.", "code": "CONFLICT" }

// 400 Bad Request (validation)
{ "success": false, "error": "Validation failed", "details": { "quantity": ["Quantity must be at least 1"] } }
```

### `POST /api/reservations/:id/confirm`

```json
// 200 OK
{ "success": true, "data": { "id": "clres...", "status": "CONFIRMED" } }

// 410 Gone (expired)
{ "success": false, "error": "Reservation has expired and can no longer be confirmed.", "code": "GONE" }
```

### `POST /api/reservations/:id/release`

```json
// 200 OK
{ "success": true, "data": { "id": "clres...", "status": "RELEASED" } }
```

---

## Trade-offs & Design Decisions

| Decision | Rationale |
|---|---|
| `reservedUnits` counter on `Inventory` | Avoids expensive `COUNT(*)` joins on every availability check. Updated atomically within the same transaction. |
| `FOR UPDATE` over `SERIALIZABLE` | Simpler error handling; no application-level retry loops; deterministic outcome for checkout |
| Cron expiry over background worker | Serverless-compatible; bounded staleness acceptable for 15-min TTL |
| Redis idempotency over DB | Lower latency; native TTL; decoupled from write path |
| React Query with `refetchInterval` | Near-realtime stock updates without WebSockets; simpler infrastructure |
| Prisma + raw SQL for `FOR UPDATE` | Prisma doesn't natively expose `FOR UPDATE`; `$queryRaw` gives precise control |
| Decimal price as string in API | Avoids IEEE 754 float precision loss in JSON serialization |

---

## Future Improvements

- **Authentication**: Integrate NextAuth.js or Clerk; tie reservations to user accounts
- **WebSockets / SSE**: Push stock updates to all clients in real-time instead of polling
- **Event-driven expiry**: Replace cron with Inngest or QStash for per-reservation TTL events; eliminates staleness window entirely
- **Distributed locking**: For multi-region deployments, Redis-based distributed locks (Redlock) instead of Postgres `FOR UPDATE`
- **Metrics & observability**: OpenTelemetry traces for reservation latency; Grafana dashboard for stock levels
- **Rate limiting**: Upstash Ratelimit on `/api/reservations` to prevent abuse
- **Admin dashboard**: CRUD for products/warehouses, reservation history, expiry analytics
- **Unit & integration tests**: Vitest for services; Playwright for E2E checkout flow; concurrent reservation test with `Promise.all`
- **Pagination**: Cursor-based pagination on product listing for large catalogues
- **Warehouse routing**: Auto-select nearest warehouse based on user's pin code

---

## Git Commit Strategy

```
feat: setup nextjs 15 app router with typescript
feat: configure prisma with postgres and base schema
feat: implement inventory and product data models
feat: add warehouse and reservation schemas with indexes
feat: implement concurrency-safe reservation service (SELECT FOR UPDATE)
feat: add product and warehouse api routes
feat: implement reservation confirm and release endpoints
feat: add reservation expiry cron job handler
feat: integrate upstash redis idempotency layer
feat: add product listing page with real-time stock updates
feat: implement reservation checkout page with countdown timer
feat: add reserve dialog with warehouse and quantity selection
feat: implement toast notifications and optimistic ui patterns
fix: handle lazy expiry on confirm for edge case expired reservations
feat: add docker compose for local postgres development
feat: configure vercel cron for automated reservation expiry
docs: write comprehensive readme with architecture and trade-offs
chore: add env example and deployment configuration
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Test concurrency safety
test("only one of two concurrent reservations succeeds for last unit", async () => {
  const [result1, result2] = await Promise.allSettled([
    reservationService.create({ productId, warehouseId, quantity: 1 }),
    reservationService.create({ productId, warehouseId, quantity: 1 }),
  ]);
  const succeeded = [result1, result2].filter((r) => r.status === "fulfilled");
  const failed = [result1, result2].filter((r) => r.status === "rejected");
  expect(succeeded).toHaveLength(1);
  expect(failed).toHaveLength(1);
  expect((failed[0] as PromiseRejectedResult).reason.code).toBe("INSUFFICIENT_STOCK");
});
```

### Integration Tests

- Reserve → Confirm happy path
- Reserve → Expire → Confirm returns 410
- Reserve → Release → inventory freed
- Concurrent reservations on single-unit stock

### E2E Tests (Playwright)

- Full checkout flow: browse → reserve → confirm
- Countdown timer visible and counting down
- Expired reservation shows graceful error state
- Mobile responsive checkout

---

## License

MIT — built as a take-home assessment for Allo Health.
