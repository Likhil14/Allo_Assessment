/**
 * lib/redis.ts
 * Upstash Redis client.
 *
 * Upstash offers a serverless-compatible Redis via HTTP — no persistent TCP
 * connection needed, which makes it ideal for Vercel edge/serverless functions.
 *
 * If Redis is not configured (e.g. local dev without Upstash), the idempotency
 * middleware falls back to a no-op so the app still functions.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export { redis };

// ------------------------------------------------------------------ //
//  Typed wrappers
// ------------------------------------------------------------------ //

/** Store a value with optional TTL (seconds). Returns false if Redis unavailable. */
export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  if (!redis) return false;
  try {
    if (ttlSeconds) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await redis.set(key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}

/** Retrieve and JSON-parse a Redis value. Returns null if missing/unavailable. */
export async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(key);
    if (raw === null) return null;
    // Upstash client already parses JSON — check type
    if (typeof raw === "string") return JSON.parse(raw) as T;
    return raw as T;
  } catch {
    return null;
  }
}
