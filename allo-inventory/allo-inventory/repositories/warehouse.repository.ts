/**
 * repositories/warehouse.repository.ts
 */

import { prisma } from "@/lib/prisma";

export const warehouseRepository = {
  async findAll() {
    return prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  },

  async findById(id: string) {
    return prisma.warehouse.findUnique({ where: { id } });
  },
};
