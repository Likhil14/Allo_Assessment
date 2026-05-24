/**
 * validations/index.ts
 * Zod schemas for all incoming request bodies and query params.
 * Colocated here so both API routes and server actions share them.
 */

import { z } from "zod";

// ------------------------------------------------------------------ //
//  Reservation schemas
// ------------------------------------------------------------------ //

export const createReservationSchema = z.object({
  productId: z.string().cuid({ message: "Invalid product ID" }),
  warehouseId: z.string().cuid({ message: "Invalid warehouse ID" }),
  quantity: z
    .number()
    .int({ message: "Quantity must be a whole number" })
    .min(1, { message: "Quantity must be at least 1" })
    .max(100, { message: "Quantity cannot exceed 100 per reservation" }),
  clientRef: z.string().max(255).optional(),
});

export type CreateReservationSchema = z.infer<typeof createReservationSchema>;

export const confirmReservationSchema = z.object({
  id: z.string().cuid({ message: "Invalid reservation ID" }),
});

export const releaseReservationSchema = z.object({
  id: z.string().cuid({ message: "Invalid reservation ID" }),
});

// ------------------------------------------------------------------ //
//  Query param schemas
// ------------------------------------------------------------------ //

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
