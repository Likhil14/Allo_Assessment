/**
 * __tests__/reservation-concurrency.test.ts
 *
 * Integration tests for the reservation service — especially the concurrency-safe
 * locking behaviour. These tests require a real PostgreSQL connection.
 *
 * Run: npx vitest run __tests__/reservation-concurrency.test.ts
 *
 * Setup: Ensure DATABASE_URL points to a test database before running.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { PrismaClient } from "@prisma/client"
import { reservationService, ReservationError } from "../services/reservation.service"

const prisma = new PrismaClient()

// ── Test fixtures ────────────────────────────────────────────────────────────

const TEST_PRODUCT_ID = "test_prod_01"
const TEST_WAREHOUSE_ID = "test_wh_01"

async function seedTestData(totalUnits: number) {
  await prisma.product.upsert({
    where: { id: TEST_PRODUCT_ID },
    update: {},
    create: {
      id: TEST_PRODUCT_ID,
      name: "Test Product",
      sku: "TEST-SKU-001",
      price: 100,
    },
  })

  await prisma.warehouse.upsert({
    where: { id: TEST_WAREHOUSE_ID },
    update: {},
    create: {
      id: TEST_WAREHOUSE_ID,
      name: "Test Warehouse",
      location: "Test City",
    },
  })

  await prisma.inventory.upsert({
    where: {
      productId_warehouseId: {
        productId: TEST_PRODUCT_ID,
        warehouseId: TEST_WAREHOUSE_ID,
      },
    },
    update: { totalUnits, reservedUnits: 0, version: 0 },
    create: {
      productId: TEST_PRODUCT_ID,
      warehouseId: TEST_WAREHOUSE_ID,
      totalUnits,
      reservedUnits: 0,
    },
  })
}

async function cleanupTestData() {
  await prisma.reservation.deleteMany({
    where: {
      productId: TEST_PRODUCT_ID,
      warehouseId: TEST_WAREHOUSE_ID,
    },
  })
  await prisma.inventory.deleteMany({
    where: { productId: TEST_PRODUCT_ID, warehouseId: TEST_WAREHOUSE_ID },
  })
  await prisma.product.deleteMany({ where: { id: TEST_PRODUCT_ID } })
  await prisma.warehouse.deleteMany({ where: { id: TEST_WAREHOUSE_ID } })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ReservationService — concurrency safety", () => {
  beforeAll(async () => {
    await cleanupTestData().catch(() => {})
  })

  afterAll(async () => {
    await cleanupTestData().catch(() => {})
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Delete reservations between tests so inventory is clean
    await prisma.reservation.deleteMany({
      where: { productId: TEST_PRODUCT_ID, warehouseId: TEST_WAREHOUSE_ID },
    })
  })

  // ── Core concurrency test ─────────────────────────────────────────────────

  it("only ONE of two concurrent reservation attempts succeeds when 1 unit remains", async () => {
    await seedTestData(1)

    // Fire two simultaneous requests for the last unit
    const [result1, result2] = await Promise.allSettled([
      reservationService.create({
        productId: TEST_PRODUCT_ID,
        warehouseId: TEST_WAREHOUSE_ID,
        quantity: 1,
      }),
      reservationService.create({
        productId: TEST_PRODUCT_ID,
        warehouseId: TEST_WAREHOUSE_ID,
        quantity: 1,
      }),
    ])

    const successes = [result1, result2].filter((r) => r.status === "fulfilled")
    const failures = [result1, result2].filter((r) => r.status === "rejected")

    // Exactly one should succeed, one should fail with INSUFFICIENT_STOCK
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)

    const failureReason = (failures[0] as PromiseRejectedResult).reason
    expect(failureReason).toBeInstanceOf(ReservationError)
    expect((failureReason as ReservationError).code).toBe("INSUFFICIENT_STOCK")

    // Verify DB state: reservedUnits must equal 1, not 2
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
        },
      },
    })
    expect(inventory?.reservedUnits).toBe(1)
    expect(inventory!.reservedUnits).toBeLessThanOrEqual(inventory!.totalUnits)
  })

  // ── High-contention test ──────────────────────────────────────────────────

  it("handles 10 concurrent requests for 3 units — exactly 3 succeed", async () => {
    await seedTestData(3)

    const REQUESTS = 10
    const results = await Promise.allSettled(
      Array.from({ length: REQUESTS }, () =>
        reservationService.create({
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
          quantity: 1,
        })
      )
    )

    const successes = results.filter((r) => r.status === "fulfilled")
    const failures = results.filter((r) => r.status === "rejected")

    expect(successes).toHaveLength(3)
    expect(failures).toHaveLength(7)

    // All failures must be INSUFFICIENT_STOCK — no unexpected errors
    failures.forEach((f) => {
      const err = (f as PromiseRejectedResult).reason as ReservationError
      expect(err.code).toBe("INSUFFICIENT_STOCK")
    })

    // DB must not be oversold
    const inv = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
        },
      },
    })
    expect(inv!.reservedUnits).toBe(3)
    expect(inv!.reservedUnits).toBeLessThanOrEqual(inv!.totalUnits)
  })

  // ── Confirm flow ──────────────────────────────────────────────────────────

  it("confirms a PENDING reservation successfully", async () => {
    await seedTestData(5)

    const reservation = await reservationService.create({
      productId: TEST_PRODUCT_ID,
      warehouseId: TEST_WAREHOUSE_ID,
      quantity: 2,
    })

    expect(reservation.status).toBe("PENDING")

    const confirmed = await reservationService.confirm(reservation.id)
    expect(confirmed.status).toBe("CONFIRMED")
  })

  it("returns EXPIRED error when confirming past expiresAt", async () => {
    await seedTestData(5)

    const reservation = await reservationService.create({
      productId: TEST_PRODUCT_ID,
      warehouseId: TEST_WAREHOUSE_ID,
      quantity: 1,
    })

    // Force-expire the reservation
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    await expect(reservationService.confirm(reservation.id)).rejects.toMatchObject({
      code: "EXPIRED",
    })
  })

  // ── Release flow ──────────────────────────────────────────────────────────

  it("releases a reservation and restores inventory", async () => {
    await seedTestData(5)

    const reservation = await reservationService.create({
      productId: TEST_PRODUCT_ID,
      warehouseId: TEST_WAREHOUSE_ID,
      quantity: 3,
    })

    // Before release: 3 units reserved
    let inv = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
        },
      },
    })
    expect(inv!.reservedUnits).toBe(3)

    await reservationService.release(reservation.id)

    // After release: 0 units reserved
    inv = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
        },
      },
    })
    expect(inv!.reservedUnits).toBe(0)
  })

  // ── Expiry cleanup ────────────────────────────────────────────────────────

  it("expireStale() releases inventory for expired PENDING reservations", async () => {
    await seedTestData(10)

    // Create two reservations and immediately expire them
    const [res1, res2] = await Promise.all([
      reservationService.create({
        productId: TEST_PRODUCT_ID,
        warehouseId: TEST_WAREHOUSE_ID,
        quantity: 2,
      }),
      reservationService.create({
        productId: TEST_PRODUCT_ID,
        warehouseId: TEST_WAREHOUSE_ID,
        quantity: 3,
      }),
    ])

    // Force expiry
    await prisma.reservation.updateMany({
      where: { id: { in: [res1.id, res2.id] } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const expiredCount = await reservationService.expireStale()
    expect(expiredCount).toBe(2)

    // Inventory should be fully released
    const inv = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: TEST_PRODUCT_ID,
          warehouseId: TEST_WAREHOUSE_ID,
        },
      },
    })
    expect(inv!.reservedUnits).toBe(0)
  })
})
