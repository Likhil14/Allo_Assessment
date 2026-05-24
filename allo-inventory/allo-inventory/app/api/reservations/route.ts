/**
 * app/api/reservations/route.ts
 * POST /api/reservations — create a reservation (concurrency-safe)
 */

import { NextRequest } from "next/server";
import { createReservationSchema } from "@/validations";
import { reservationService, ReservationError } from "@/services/reservation.service";
import { withIdempotency } from "@/lib/idempotency";
import {
  created,
  badRequest,
  conflict,
  notFound,
  internalError,
  zodError,
} from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withIdempotency(req, "POST /api/reservations", async () => {
    // --- Parse & validate body ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(parsed.error);
    }

    // --- Attempt reservation ---
    try {
      const reservation = await reservationService.create(parsed.data);
      return created({
        ...reservation,
        product: {
          ...reservation.product,
          price: reservation.product.price.toString(),
        },
      });
    } catch (error) {
      if (error instanceof ReservationError) {
        switch (error.code) {
          case "INSUFFICIENT_STOCK":
            // HTTP 409 Conflict: the state of the resource (inventory) conflicts
            // with the requested operation — semantically correct for stock exhaustion.
            return conflict(error.message);
          case "NOT_FOUND":
            return notFound(error.message);
          default:
            return badRequest(error.message);
        }
      }
      console.error("[POST /api/reservations]", error);
      return internalError();
    }
  });
}
