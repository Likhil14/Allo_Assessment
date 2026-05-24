/**
 * app/api/reservations/[id]/route.ts
 * GET /api/reservations/:id
 */

import { NextRequest } from "next/server";
import { reservationRepository } from "@/repositories/reservation.repository";
import { ok, notFound, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const reservation = await reservationRepository.findById(id);
    if (!reservation) return notFound("Reservation not found.");

    return ok({
      ...reservation,
      product: {
        ...reservation.product,
        price: reservation.product.price.toString(),
      },
    });
  } catch (error) {
    console.error(`[GET /api/reservations/${id}]`, error);
    return internalError();
  }
}
