/**
 * app/page.tsx — Product Listing Page
 */

import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductGridSkeleton } from "@/components/products/product-grid-skeleton";
import { Header } from "@/components/layout/header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            Live Inventory
          </p>
          <h1 className="font-display mt-2 text-4xl text-slate-900">
            Pharmaceutical Catalogue
          </h1>
          <p className="mt-2 text-slate-500">
            Reserve medications instantly. Stock is secured for 15 minutes
            after reservation.
          </p>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </main>
    </div>
  );
}
