/**
 * app/api/warehouses/route.ts
 * GET /api/warehouses
 */

import { warehouseRepository } from "@/repositories/warehouse.repository";
import { ok, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const warehouses = await warehouseRepository.findAll();
    return ok(warehouses);
  } catch (error) {
    console.error("[GET /api/warehouses]", error);
    return internalError();
  }
}
