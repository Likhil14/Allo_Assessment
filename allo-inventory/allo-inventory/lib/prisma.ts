/**
 * lib/prisma.ts
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reload would create a new PrismaClient on every
 * module reload and quickly exhaust the PostgreSQL connection pool.
 * We cache the instance on `globalThis` to survive HMR cycles.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
