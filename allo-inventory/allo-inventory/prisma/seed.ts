/**
 * prisma/seed.ts
 * Populates the database with realistic demo data.
 * Run: npx prisma db seed
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ------------------------------------------------------------------ //
  //  Warehouses
  // ------------------------------------------------------------------ //
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: "wh_mumbai" },
      update: {},
      create: {
        id: "wh_mumbai",
        name: "Mumbai Central",
        location: "Mumbai, Maharashtra",
      },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh_delhi" },
      update: {},
      create: {
        id: "wh_delhi",
        name: "Delhi North",
        location: "New Delhi, Delhi",
      },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh_bangalore" },
      update: {},
      create: {
        id: "wh_bangalore",
        name: "Bangalore Tech Park",
        location: "Bengaluru, Karnataka",
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // ------------------------------------------------------------------ //
  //  Products
  // ------------------------------------------------------------------ //
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "MED-OZEM-01" },
      update: {},
      create: {
        id: "prod_ozempic",
        name: "Ozempic (Semaglutide) 0.5mg",
        description:
          "Weekly injectable GLP-1 receptor agonist for type 2 diabetes management.",
        sku: "MED-OZEM-01",
        price: new Prisma.Decimal("14999.00"),
        imageUrl: "https://placehold.co/400x400/e8f4f8/1a6b8a?text=Ozempic",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-MET-500" },
      update: {},
      create: {
        id: "prod_metformin",
        name: "Metformin 500mg (90 Tablets)",
        description:
          "First-line oral medication for type 2 diabetes. Reduces hepatic glucose production.",
        sku: "MED-MET-500",
        price: new Prisma.Decimal("299.00"),
        imageUrl: "https://placehold.co/400x400/f0f7f0/1a6b3a?text=Metformin",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-INS-GLARGINE" },
      update: {},
      create: {
        id: "prod_insulin",
        name: "Insulin Glargine 100IU/ml",
        description:
          "Long-acting basal insulin analog for once-daily subcutaneous injection.",
        sku: "MED-INS-GLARGINE",
        price: new Prisma.Decimal("1899.00"),
        imageUrl: "https://placehold.co/400x400/f8f0f8/6b1a8a?text=Insulin",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-CGMS-LIBRE" },
      update: {},
      create: {
        id: "prod_cgm",
        name: "FreeStyle Libre 3 Sensor (2-pack)",
        description:
          "Continuous glucose monitoring sensor. 14-day wear, factory-calibrated.",
        sku: "MED-CGMS-LIBRE",
        price: new Prisma.Decimal("4999.00"),
        imageUrl: "https://placehold.co/400x400/f8f4e8/8a6b1a?text=CGM",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-THYRO-50" },
      update: {},
      create: {
        id: "prod_thyro",
        name: "Levothyroxine 50mcg (30 Tablets)",
        description:
          "Synthetic thyroid hormone replacement for hypothyroidism management.",
        sku: "MED-THYRO-50",
        price: new Prisma.Decimal("189.00"),
        imageUrl:
          "https://placehold.co/400x400/e8f8f4/1a8a6b?text=Levothyroxine",
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // ------------------------------------------------------------------ //
  //  Inventory — different stock levels per warehouse
  // ------------------------------------------------------------------ //
  const inventoryData = [
    // Mumbai
    { productId: "prod_ozempic", warehouseId: "wh_mumbai", totalUnits: 3 },
    { productId: "prod_metformin", warehouseId: "wh_mumbai", totalUnits: 150 },
    { productId: "prod_insulin", warehouseId: "wh_mumbai", totalUnits: 45 },
    { productId: "prod_cgm", warehouseId: "wh_mumbai", totalUnits: 12 },
    { productId: "prod_thyro", warehouseId: "wh_mumbai", totalUnits: 200 },
    // Delhi
    { productId: "prod_ozempic", warehouseId: "wh_delhi", totalUnits: 8 },
    { productId: "prod_metformin", warehouseId: "wh_delhi", totalUnits: 0 }, // out of stock
    { productId: "prod_insulin", warehouseId: "wh_delhi", totalUnits: 22 },
    { productId: "prod_cgm", warehouseId: "wh_delhi", totalUnits: 5 },
    { productId: "prod_thyro", warehouseId: "wh_delhi", totalUnits: 80 },
    // Bangalore
    { productId: "prod_ozempic", warehouseId: "wh_bangalore", totalUnits: 1 }, // critically low
    { productId: "prod_metformin", warehouseId: "wh_bangalore", totalUnits: 300 },
    { productId: "prod_insulin", warehouseId: "wh_bangalore", totalUnits: 60 },
    { productId: "prod_cgm", warehouseId: "wh_bangalore", totalUnits: 20 },
    { productId: "prod_thyro", warehouseId: "wh_bangalore", totalUnits: 110 },
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: inv.productId,
          warehouseId: inv.warehouseId,
        },
      },
      update: { totalUnits: inv.totalUnits },
      create: {
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        totalUnits: inv.totalUnits,
        reservedUnits: 0,
      },
    });
  }

  console.log(`✅ Created ${inventoryData.length} inventory records`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
