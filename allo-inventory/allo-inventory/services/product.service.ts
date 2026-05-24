/**
 * services/product.service.ts
 * Business logic for products — enriches raw DB data with computed fields.
 */

import { productRepository } from "@/repositories/product.repository"

export const productService = {
  async getAllWithInventory() {
    const raw = await productRepository.findAllWithInventory()

    return raw.map((p) => ({
      ...p,
      price: p.price.toString(),
      inventory: p.inventory.map((inv) => ({
        ...inv,
        availableUnits: Math.max(0, inv.totalUnits - inv.reservedUnits),
      })),
      totalAvailable: p.inventory.reduce(
        (sum, inv) => sum + Math.max(0, inv.totalUnits - inv.reservedUnits),
        0
      ),
      totalStock: p.inventory.reduce((sum, inv) => sum + inv.totalUnits, 0),
    }))
  },

  async getById(id: string) {
    const p = await productRepository.findById(id)
    if (!p) return null

    return {
      ...p,
      price: p.price.toString(),
      inventory: p.inventory.map((inv) => ({
        ...inv,
        availableUnits: Math.max(0, inv.totalUnits - inv.reservedUnits),
      })),
      totalAvailable: p.inventory.reduce(
        (sum, inv) => sum + Math.max(0, inv.totalUnits - inv.reservedUnits),
        0
      ),
    }
  },
}
