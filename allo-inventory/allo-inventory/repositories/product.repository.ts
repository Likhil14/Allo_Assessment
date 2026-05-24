/**
 * repositories/product.repository.ts
 * All Prisma queries related to products live here.
 * Services call repositories — never query Prisma directly from API routes.
 */

import { prisma } from "@/lib/prisma";

export const productRepository = {
  /** Returns all products with their per-warehouse inventory. */
  async findAllWithInventory() {
    return prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
          orderBy: { warehouse: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        inventory: { include: { warehouse: true } },
      },
    });
  },
};
