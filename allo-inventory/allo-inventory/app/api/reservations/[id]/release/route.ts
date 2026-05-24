/**
 * app/api/reservations/[id]/release/route.ts
 * POST /api/reservations/:id/release
 */

import { NextRequest } from "next/server";
import { reservationService, ReservationError } from "@/services/reservation.service";
import { ok, notFound, badRequest, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const reservation = await reservationService.release(id);
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
        default:
          return badRequest(error.message);
      }
    }
    console.error(`[POST /api/reservations/${id}/release]`, error);
    return internalError();
  }
}
