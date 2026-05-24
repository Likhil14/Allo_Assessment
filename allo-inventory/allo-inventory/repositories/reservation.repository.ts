/**
 * repositories/reservation.repository.ts
 * Prisma queries for reservation data access.
 * Concurrency-critical queries are kept here and called from the service
 * inside explicit transactions.
 */

import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const reservationRepository = {
  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });
  },

  async findAll() {
    return prisma.reservation.findMany({
      include: { product: true, warehouse: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Find and lock the inventory row for update.
   * Must be called inside a transaction with SERIALIZABLE or READ COMMITTED + FOR UPDATE.
   *
   * Prisma exposes raw SQL for SELECT FOR UPDATE — we use $queryRaw here to
   * gain row-level locking, which prevents phantom reads in concurrent reservations.
   */
  async lockInventoryForUpdate(
    productId: string,
    warehouseId: string,
    tx: Prisma.TransactionClient
  ) {
    // SELECT FOR UPDATE acquires an exclusive row lock until the transaction
    // commits or rolls back. Concurrent requests block here rather than
    // proceeding with stale data — this is the core of our concurrency safety.
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        totalUnits: number;
        reservedUnits: number;
        version: number;
      }>
    >`
      SELECT id, "totalUnits", "reservedUnits", version
      FROM "Inventory"
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  },

  async updateInventoryReservedUnits(
    inventoryId: string,
    delta: number, // positive = reserve, negative = release
    tx: Prisma.TransactionClient
  ) {
    return tx.inventory.update({
      where: { id: inventoryId },
      data: {
        reservedUnits: { increment: delta },
        version: { increment: 1 },
      },
    });
  },

  async create(
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
      expiresAt: Date;
      clientRef?: string;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.reservation.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        status: "PENDING",
        expiresAt: data.expiresAt,
        clientRef: data.clientRef,
      },
      include: { product: true, warehouse: true },
    });
  },

  async updateStatus(
    id: string,
    status: ReservationStatus,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.reservation.update({
      where: { id },
      data: { status },
      include: { product: true, warehouse: true },
    });
  },

  /** Find all PENDING reservations past their expiry time. */
  async findExpired() {
    return prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
    });
  },
};
