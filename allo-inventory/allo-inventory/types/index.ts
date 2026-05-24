/**
 * types/index.ts
 * Centralised type definitions — single source of truth.
 * All API responses and domain objects are typed here.
 */

import { ReservationStatus } from "@prisma/client";

// ------------------------------------------------------------------ //
//  Domain types (mirrors Prisma models but safe for client-side use)
// ------------------------------------------------------------------ //

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  imageUrl: string | null;
  price: string; // Decimal serialised as string
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number; // computed: totalUnits - reservedUnits
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  clientRef: string | null;
}

// ------------------------------------------------------------------ //
//  Enriched / joined types for API responses
// ------------------------------------------------------------------ //

export interface InventoryWithWarehouse extends Inventory {
  warehouse: Warehouse;
}

export interface ProductWithInventory extends Product {
  inventory: InventoryWithWarehouse[];
  totalAvailable: number; // sum across warehouses
}

export interface ReservationWithDetails extends Reservation {
  product: Product;
  warehouse: Warehouse;
}

// ------------------------------------------------------------------ //
//  API response envelopes
// ------------------------------------------------------------------ //

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ------------------------------------------------------------------ //
//  Request body types (mirrors Zod schemas)
// ------------------------------------------------------------------ //

export interface CreateReservationInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  clientRef?: string;
}

export interface ConfirmReservationInput {
  id: string;
}

// ------------------------------------------------------------------ //
//  Misc
// ------------------------------------------------------------------ //

export type ReservationStatusType = ReservationStatus;
