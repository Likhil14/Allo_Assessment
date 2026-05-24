/**
 * hooks/use-products.ts
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api-client";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 30_000, // Consider data fresh for 30s — reduces unnecessary refetches
    refetchInterval: 60_000, // Background refresh every 60s for near-realtime stock updates
  });
}
