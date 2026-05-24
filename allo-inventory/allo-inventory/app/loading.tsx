/**
 * app/loading.tsx
 * Shown while the root page is streaming from the server.
 */

import { Header } from "@/components/layout/header"
import { ProductGridSkeleton } from "@/components/products/product-grid-skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
        </div>
        <ProductGridSkeleton />
      </main>
    </div>
  )
}
