/**
 * app/api/cron/expire-reservations/route.ts
 *
 * Reservation Expiry Cleanup — Design Rationale
 * -----------------------------------------------
 * Three strategies exist for handling reservation expiry:
 *
 * 1. Eager: Background worker continuously polls and cleans up.
 *    Pro: Low latency; inventory freed quickly.
 *    Con: Requires persistent infrastructure (not serverless-compatible).
 *
 * 2. Lazy: Check expiry only when a reservation is accessed.
 *    Pro: Zero infrastructure cost.
 *    Con: Stale reservedUnits linger until the reservation is touched; this
 *         blocks other users from seeing real availability.
 *
 * 3. Cron (chosen): Scheduled API route called every N minutes by Vercel Cron
 *    (or any external scheduler like GitHub Actions, Inngest, or QStash).
 *    Pro: Works on serverless, low cost, bounded staleness (≤1 cron interval).
 *    Con: Inventory stays blocked until next cron run (acceptable for ≤15 min TTL).
 *
 * We combine lazy expiry on confirm (see reservation.service.ts) with this cron
 * to ensure stale inventory is freed promptly even if no one touches the reservation.
 *
 * Security: Vercel signs cron requests with a shared secret in the
 * `Authorization` header. We verify it here.
 */

import { NextRequest } from "next/server";
import { reservationService } from "@/services/reservation.service";
import { ok, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify Vercel Cron or internal caller via shared secret
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const count = await reservationService.expireStale();
    console.log(`[cron/expire-reservations] Expired ${count} reservations.`);
    return ok({ expiredCount: count, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/expire-reservations]", error);
    return internalError("Cron job failed.");
  }
}
