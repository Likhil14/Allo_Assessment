/**
 * components/products/reserve-dialog.tsx
 */

"use client";

import { useState } from "react";
import { Minus, Plus, Loader2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductWithInventory } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithInventory;
  onReserve: (warehouseId: string, quantity: number) => Promise<void>;
  isLoading: boolean;
}

export function ReserveDialog({ open, onOpenChange, product, onReserve, isLoading }: Props) {
  const availableWarehouses = product.inventory.filter((i) => i.availableUnits > 0);
  const [warehouseId, setWarehouseId] = useState(availableWarehouses[0]?.warehouseId ?? "");
  const [quantity, setQuantity] = useState(1);

  const selectedInventory = product.inventory.find(
    (i) => i.warehouseId === warehouseId
  );
  const maxQty = selectedInventory?.availableUnits ?? 1;

  const handleQuantityChange = (delta: number) => {
    setQuantity((q) => Math.min(maxQty, Math.max(1, q + delta)));
  };

  const handleWarehouseChange = (val: string) => {
    setWarehouseId(val);
    setQuantity(1); // reset quantity when warehouse changes
  };

  const handleSubmit = async () => {
    if (!warehouseId) return;
    await onReserve(warehouseId, quantity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Reserve Item</DialogTitle>
          <DialogDescription className="text-slate-500">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Warehouse selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Fulfillment Warehouse</Label>
            <Select value={warehouseId} onValueChange={handleWarehouseChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {product.inventory.map((inv) => (
                  <SelectItem
                    key={inv.warehouseId}
                    value={inv.warehouseId}
                    disabled={inv.availableUnits === 0}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span>{inv.warehouse.name}</span>
                      <span
                        className={`text-xs font-medium ${
                          inv.availableUnits === 0
                            ? "text-slate-400"
                            : inv.availableUnits <= 3
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {inv.availableUnits === 0
                          ? "Out of stock"
                          : `${inv.availableUnits} left`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-lg font-semibold tabular-nums text-slate-900">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= maxQty}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-400">of {maxQty} available</span>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-sky-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Unit price</span>
              <span className="font-medium">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-slate-600">Quantity</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="mt-2 border-t border-sky-100 pt-2 flex justify-between text-base">
              <span className="font-semibold text-slate-800">Total</span>
              <span className="font-bold text-sky-700">
                ₹{(Number(product.price) * quantity).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Expiry notice */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Reservation expires in 15 minutes. Complete checkout to confirm.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="bg-sky-700 hover:bg-sky-800 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !warehouseId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving…
              </>
            ) : (
              "Confirm Reservation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
