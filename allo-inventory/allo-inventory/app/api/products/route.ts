/**
 * app/api/products/route.ts
 * GET /api/products — returns all products with inventory per warehouse.
 */

import { NextResponse } from "next/server";
import { productRepository } from "@/repositories/product.repository";
import { ok, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic"; // Always fetch fresh data

export async function GET() {
  try {
    const rawProducts = await productRepository.findAllWithInventory();

    // Enrich with availableUnits (computed field) and totalAvailable aggregate
    const products = rawProducts.map((p) => ({
      ...p,
      price: p.price.toString(),
      inventory: p.inventory.map((inv) => ({
        ...inv,
        availableUnits: inv.totalUnits - inv.reservedUnits,
      })),
      totalAvailable: p.inventory.reduce(
        (sum, inv) => sum + Math.max(0, inv.totalUnits - inv.reservedUnits),
        0
      ),
    }));

    return ok(products);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return internalError();
  }
}
