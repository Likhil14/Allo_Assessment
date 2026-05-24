/**
 * components/products/product-grid.tsx
 */

"use client";

import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGridSkeleton } from "./product-grid-skeleton";

export function ProductGrid() {
  const { data: products, isLoading, isError, refetch, isFetching } = useProducts();

  if (isLoading) return <ProductGridSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <h3 className="mt-4 font-semibold text-red-800">Failed to load products</h3>
        <p className="mt-1 text-sm text-red-600">
          Something went wrong fetching inventory data.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
          onClick={() => refetch()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 py-16 text-center text-slate-500">
        No products found.
      </div>
    );
  }

  return (
    <div>
      {isFetching && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Updating stock levels…
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
