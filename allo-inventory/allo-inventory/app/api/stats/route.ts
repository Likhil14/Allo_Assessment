/**
 * app/api/stats/route.ts
 * GET /api/stats — aggregate numbers for the admin dashboard.
 */

import { prisma } from "@/lib/prisma"
import { ok, internalError } from "@/lib/api-response"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [
      totalProducts,
      totalWarehouses,
      reservationCounts,
      lowStockItems,
      recentReservations,
    ] = await Promise.all([
      prisma.product.count(),

      prisma.warehouse.count(),

      prisma.reservation.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Inventory rows where available units <= 3 (critical stock)
      prisma.inventory.findMany({
        where: {
          totalUnits: { gt: 0 },
        },
        include: { product: true, warehouse: true },
        orderBy: { totalUnits: "asc" },
        take: 5,
      }),

      // Last 10 reservations
      prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
        },
      }),
    ])

    const statusMap = Object.fromEntries(
      reservationCounts.map((r) => [r.status, r._count.id])
    )

    return ok({
      totalProducts,
      totalWarehouses,
      reservations: {
        pending: statusMap["PENDING"] ?? 0,
        confirmed: statusMap["CONFIRMED"] ?? 0,
        released: statusMap["RELEASED"] ?? 0,
        expired: statusMap["EXPIRED"] ?? 0,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      },
      lowStockItems: lowStockItems.map((inv) => ({
        productName: inv.product.name,
        warehouseName: inv.warehouse.name,
        availableUnits: Math.max(0, inv.totalUnits - inv.reservedUnits),
        totalUnits: inv.totalUnits,
      })),
      recentReservations: recentReservations.map((r) => ({
        id: r.id,
        productName: r.product.name,
        sku: r.product.sku,
        warehouseName: r.warehouse.name,
        quantity: r.quantity,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
    })
  } catch (error) {
    console.error("[GET /api/stats]", error)
    return internalError()
  }
}
