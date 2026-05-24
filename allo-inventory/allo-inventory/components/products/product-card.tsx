/**
 * components/products/product-card.tsx
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, MapPin, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReserveDialog } from "./reserve-dialog";
import { useCreateReservation } from "@/hooks/use-reservations";
import { ApiError } from "@/lib/api-client";
import type { ProductWithInventory } from "@/types";

interface Props {
  product: ProductWithInventory;
}

function getStockStatus(available: number, total: number) {
  if (available === 0) return { label: "Out of Stock", variant: "out" as const };
  if (available <= 2) return { label: "Critical", variant: "critical" as const };
  if (available / total < 0.2) return { label: "Low Stock", variant: "low" as const };
  if (available / total < 0.5) return { label: "Limited", variant: "medium" as const };
  return { label: "In Stock", variant: "high" as const };
}

const variantStyles = {
  out: "bg-slate-100 text-slate-500 border-slate-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  low: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function ProductCard({ product }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const { mutateAsync: reserve, isPending } = useCreateReservation();

  const stockStatus = getStockStatus(product.totalAvailable, 
    product.inventory.reduce((s, i) => s + i.totalUnits, 0));
  const isOutOfStock = product.totalAvailable === 0;

  const handleReserve = async (warehouseId: string, quantity: number) => {
    try {
      const reservation = await reserve({
        productId: product.id,
        warehouseId,
        quantity,
      });
      setDialogOpen(false);
      toast.success("Reservation created!", {
        description: `${quantity}× ${product.name} reserved for 15 minutes.`,
      });
      router.push(`/reservations/${reservation.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          toast.error("Insufficient stock", {
            description: error.message,
          });
        } else {
          toast.error("Reservation failed", { description: error.message });
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="relative p-0">
          {/* Product image placeholder */}
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 p-6">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-auto object-contain"
              />
            ) : (
              <Package className="h-16 w-16 text-slate-300" />
            )}
          </div>

          {/* Stock badge */}
          <div className="absolute right-3 top-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantStyles[stockStatus.variant]}`}
            >
              {stockStatus.variant === "critical" && (
                <AlertTriangle className="mr-1 h-3 w-3" />
              )}
              {stockStatus.label}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <p className="text-xs font-mono text-slate-400">{product.sku}</p>
            <h3 className="mt-1 font-semibold leading-snug text-slate-900">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          {/* Price */}
          <p className="font-display text-2xl text-sky-700">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </p>

          {/* Per-warehouse stock */}
          <div className="space-y-1.5">
            {product.inventory.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between text-xs text-slate-500"
              >
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {inv.warehouse.name}
                </span>
                <span
                  className={`font-medium ${
                    inv.availableUnits === 0
                      ? "text-slate-400"
                      : inv.availableUnits <= 3
                      ? "text-red-600"
                      : "text-slate-700"
                  }`}
                >
                  {inv.availableUnits === 0
                    ? "Out of stock"
                    : `${inv.availableUnits} available`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="border-t border-slate-100 p-4">
          <Button
            className="w-full bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={isOutOfStock || isPending}
            onClick={() => setDialogOpen(true)}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isOutOfStock ? "Out of Stock" : "Reserve Now"}
          </Button>
        </CardFooter>
      </Card>

      <ReserveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={product}
        onReserve={handleReserve}
        isLoading={isPending}
      />
    </>
  );
}
