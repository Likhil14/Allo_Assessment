/**
 * services/reservation.service.ts
 *
 * ============================================================
 * CONCURRENCY SAFETY — HOW IT WORKS
 * ============================================================
 *
 * Problem: Two users simultaneously try to reserve the last unit.
 * Naive code would:
 *   1. Read availableUnits = 1 (both see this)
 *   2. Both decide "yes, stock available"
 *   3. Both decrement → reservedUnits = 2, but totalUnits = 1 ❌
 *
 * Solution: SELECT FOR UPDATE inside a serialisable transaction.
 *
 * Flow:
 *   BEGIN TRANSACTION (READ COMMITTED with FOR UPDATE)
 *   SELECT ... FROM Inventory WHERE ... FOR UPDATE   ← acquires row lock
 *   -- Second concurrent request BLOCKS here until first commits --
 *   Check availableUnits := totalUnits - reservedUnits
 *   If < requested quantity → ROLLBACK → return 409
 *   Else → UPDATE reservedUnits += quantity
 *   INSERT Reservation
 *   COMMIT
 *
 * Why READ COMMITTED + FOR UPDATE instead of SERIALIZABLE?
 *  - SERIALIZABLE isolation catches more anomalies but causes more retries
 *    under high contention (serialization failures require application-level
 *    retry loops).
 *  - FOR UPDATE achieves the same safety for our specific pattern (single-row
 *    inventory check-and-update) with less overhead and simpler error handling.
 *  - Postgres guarantees that once the first transaction commits, the second
 *    sees the updated reservedUnits — so it correctly gets 409.
 *
 * Why NOT optimistic locking for this case?
 *  - Optimistic locking (version field CAS) works well under LOW contention.
 *    Under high contention, most transactions fail and require client retries —
 *    bad UX for a checkout flow.
 *  - FOR UPDATE is pessimistic but gives a deterministic first-writer-wins
 *    outcome without exposing retry complexity to clients.
 *
 * ============================================================
 */

import { prisma } from "@/lib/prisma";
import { reservationRepository } from "@/repositories/reservation.repository";
import { CreateReservationSchema } from "@/validations";

const RESERVATION_TTL_MINUTES = 15;

export const reservationService = {
  /**
   * Create a reservation atomically.
   * Returns the new reservation or throws a typed error.
   */
  async create(input: CreateReservationSchema) {
    return prisma.$transaction(async (tx) => {
      // --- Step 1: Lock the inventory row ---
      const inventory = await reservationRepository.lockInventoryForUpdate(
        input.productId,
        input.warehouseId,
        tx
      );

      if (!inventory) {
        throw new ReservationError(
          "Inventory record not found for this product/warehouse combination.",
          "NOT_FOUND"
        );
      }

      // --- Step 2: Check availability (using committed data under the lock) ---
      const availableUnits = inventory.totalUnits - inventory.reservedUnits;

      if (availableUnits < input.quantity) {
        throw new ReservationError(
          `Insufficient stock. Requested ${input.quantity}, available ${availableUnits}.`,
          "INSUFFICIENT_STOCK"
        );
      }

      // --- Step 3: Atomically increment reservedUnits ---
      await reservationRepository.updateInventoryReservedUnits(
        inventory.id,
        input.quantity,
        tx
      );

      // --- Step 4: Create the reservation record ---
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      const reservation = await reservationRepository.create(
        {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          expiresAt,
          clientRef: input.clientRef,
        },
        tx
      );

      return reservation;
    });
    // Prisma auto-rolls back the transaction if an exception propagates,
    // releasing the FOR UPDATE lock. Concurrent waiters are then unblocked.
  },

  /**
   * Confirm a PENDING reservation.
   * Returns 410 if the reservation has expired.
   */
  async confirm(id: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await reservationRepository.findById(id, tx);

      if (!reservation) {
        throw new ReservationError("Reservation not found.", "NOT_FOUND");
      }

      if (reservation.status === "EXPIRED" || new Date() > reservation.expiresAt) {
        // Lazily mark as expired if not already done by the cron
        if (reservation.status === "PENDING") {
          await reservationRepository.updateInventoryReservedUnits(
            await getInventoryId(reservation.productId, reservation.warehouseId, tx),
            -reservation.quantity,
            tx
          );
          await reservationRepository.updateStatus(id, "EXPIRED", tx);
        }
        throw new ReservationError(
          "Reservation has expired and can no longer be confirmed.",
          "EXPIRED"
        );
      }

      if (reservation.status !== "PENDING") {
        throw new ReservationError(
          `Reservation is already ${reservation.status.toLowerCase()}.`,
          "INVALID_STATE"
        );
      }

      return reservationRepository.updateStatus(id, "CONFIRMED", tx);
    });
  },

  /**
   * Release a PENDING or CONFIRMED reservation early.
   * Always releases the inventory units back.
   */
  async release(id: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await reservationRepository.findById(id, tx);

      if (!reservation) {
        throw new ReservationError("Reservation not found.", "NOT_FOUND");
      }

      if (reservation.status === "RELEASED" || reservation.status === "EXPIRED") {
        throw new ReservationError(
          `Reservation is already ${reservation.status.toLowerCase()}.`,
          "INVALID_STATE"
        );
      }

      // Release the held units back to available
      const inventoryId = await getInventoryId(
        reservation.productId,
        reservation.warehouseId,
        tx
      );
      await reservationRepository.updateInventoryReservedUnits(
        inventoryId,
        -reservation.quantity,
        tx
      );

      return reservationRepository.updateStatus(id, "RELEASED", tx);
    });
  },

  /**
   * Expire all PENDING reservations past their TTL.
   * Called by the cleanup cron job.
   * Returns the number of reservations expired.
   */
  async expireStale(): Promise<number> {
    const expired = await reservationRepository.findExpired();

    if (expired.length === 0) return 0;

    // Process in a single transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const res of expired) {
        const inventoryId = await getInventoryId(
          res.productId,
          res.warehouseId,
          tx
        );
        await reservationRepository.updateInventoryReservedUnits(
          inventoryId,
          -res.quantity,
          tx
        );
        await reservationRepository.updateStatus(res.id, "EXPIRED", tx);
      }
    });

    return expired.length;
  },
};

// ------------------------------------------------------------------ //
//  Helpers
// ------------------------------------------------------------------ //

async function getInventoryId(
  productId: string,
  warehouseId: string,
  tx: Parameters<typeof reservationRepository.lockInventoryForUpdate>[2]
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Inventory"
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `;
  if (!rows[0]) throw new Error("Inventory row not found during release.");
  return rows[0].id;
}

// ------------------------------------------------------------------ //
//  Typed error class
// ------------------------------------------------------------------ //

export type ReservationErrorCode =
  | "NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "EXPIRED"
  | "INVALID_STATE";

export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code: ReservationErrorCode
  ) {
    super(message);
    this.name = "ReservationError";
  }
}
