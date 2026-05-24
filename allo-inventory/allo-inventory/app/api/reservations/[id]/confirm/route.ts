/**
 * app/api/reservations/[id]/confirm/route.ts
 * POST /api/reservations/:id/confirm
 */

import { NextRequest } from "next/server";
import { reservationService, ReservationError } from "@/services/reservation.service";
import { withIdempotency } from "@/lib/idempotency";
import { ok, notFound, gone, badRequest, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withIdempotency(req, `POST /api/reservations/${id}/confirm`, async () => {
    try {
      const reservation = await reservationService.confirm(id);
      return ok({
        ...reservation,
        product: {
          ...reservation.product,
          price: reservation.product.price.toString(),
        },
      });
    } catch (error) {
      if (error instanceof ReservationError) {
        switch (error.code) {
          case "NOT_FOUND":
            return notFound(error.message);
          case "EXPIRED":
            // HTTP 410 Gone: the resource existed but is no longer available
            return gone(error.message);
          default:
            return badRequest(error.message);
        }
      }
      console.error(`[POST /api/reservations/${id}/confirm]`, error);
      return internalError();
    }
  });
}
