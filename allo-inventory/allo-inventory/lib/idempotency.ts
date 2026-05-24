/**
 * lib/idempotency.ts
 *
 * Idempotency Layer
 * -----------------
 * Many HTTP clients retry on network failure. Without idempotency controls,
 * retried POST /reservations would create duplicate reservations.
 *
 * Strategy:
 *  1. Client sends `Idempotency-Key: <uuid>` header on every mutating request.
 *  2. Before processing, we check Redis for a cached response at key
 *     `idempotency:<route>:<key>`.
 *  3. If found → return the cached response immediately (no DB write).
 *  4. If not found → process normally, then cache the response with a 24h TTL.
 *
 * Redis is used (not PostgreSQL) because:
 *  - Low-latency check on every request (sub-millisecond vs ~5ms DB round-trip)
 *  - Natural TTL support — no cleanup cron needed
 *  - Decoupled from transactional DB writes
 *
 * Fallback: if Redis is unavailable, idempotency is silently skipped.
 * This is acceptable — idempotency is a reliability enhancement, not a security
 * gate. Losing it temporarily doesn't compromise correctness.
 */

import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisSet } from "./redis";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24; // 24 hours

interface CachedResponse {
  status: number;
  body: unknown;
}

/**
 * Wraps an API handler with idempotency semantics.
 *
 * @param req     The incoming NextRequest
 * @param route   A stable identifier for this endpoint (e.g. "POST /api/reservations")
 * @param handler The actual handler function that processes the request
 */
export async function withIdempotency(
  req: NextRequest,
  route: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get("Idempotency-Key");

  // No key provided — skip idempotency, process normally
  if (!idempotencyKey) {
    return handler();
  }

  const redisKey = `idempotency:${route}:${idempotencyKey}`;

  // --- Check cache ---
  const cached = await redisGet<CachedResponse>(redisKey);
  if (cached) {
    // Return the stored response verbatim, with an extra header to signal replay
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: { "Idempotent-Replayed": "true" },
    });
  }

  // --- Process request ---
  const response = await handler();

  // Clone and cache the response (only 2xx and 4xx — not 5xx, as those may be transient)
  if (response.status < 500) {
    const body = await response.clone().json();
    await redisSet(redisKey, { status: response.status, body }, IDEMPOTENCY_TTL_SECONDS);
  }

  return response;
}
