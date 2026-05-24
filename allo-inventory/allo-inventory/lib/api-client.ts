/**
 * lib/api-client.ts
 * Typed fetch wrappers used by React Query hooks.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ProductWithInventory,
  Warehouse,
  ReservationWithDetails,
  CreateReservationInput,
} from "@/types";

const BASE = "/api";

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { idempotencyKey?: string }
): Promise<{ data: T; status: number }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.idempotencyKey
      ? { "Idempotency-Key": options.idempotencyKey }
      : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!json.success) {
    const err = new ApiError(json.error ?? "Request failed", res.status, json.code);
    throw err;
  }

  return { data: json.data as T, status: res.status };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ------------------------------------------------------------------ //
//  Products
// ------------------------------------------------------------------ //

export async function fetchProducts(): Promise<ProductWithInventory[]> {
  const { data } = await apiFetch<ProductWithInventory[]>("/products");
  return data;
}

// ------------------------------------------------------------------ //
//  Warehouses
// ------------------------------------------------------------------ //

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await apiFetch<Warehouse[]>("/warehouses");
  return data;
}

// ------------------------------------------------------------------ //
//  Reservations
// ------------------------------------------------------------------ //

export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationWithDetails> {
  const { data } = await apiFetch<ReservationWithDetails>("/reservations", {
    method: "POST",
    body: JSON.stringify(input),
    // Auto-generate an idempotency key for each checkout attempt.
    // Callers can pass a stable key if they want cross-retry deduplication.
    idempotencyKey: uuidv4(),
  });
  return data;
}

export async function confirmReservation(
  id: string
): Promise<ReservationWithDetails> {
  const { data } = await apiFetch<ReservationWithDetails>(
    `/reservations/${id}/confirm`,
    {
      method: "POST",
      idempotencyKey: `confirm-${id}`, // stable key = safe to retry
    }
  );
  return data;
}

export async function releaseReservation(
  id: string
): Promise<ReservationWithDetails> {
  const { data } = await apiFetch<ReservationWithDetails>(
    `/reservations/${id}/release`,
    { method: "POST" }
  );
  return data;
}
