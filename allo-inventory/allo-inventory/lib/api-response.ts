/**
 * lib/api-response.ts
 * Thin wrappers around NextResponse to keep API routes DRY and consistent.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, code: "BAD_REQUEST", details },
    { status: 400 }
  );
}

export function notFound(message = "Resource not found") {
  return NextResponse.json(
    { success: false, error: message, code: "NOT_FOUND" },
    { status: 404 }
  );
}

export function conflict(message: string) {
  return NextResponse.json(
    { success: false, error: message, code: "CONFLICT" },
    { status: 409 }
  );
}

export function gone(message: string) {
  return NextResponse.json(
    { success: false, error: message, code: "GONE" },
    { status: 410 }
  );
}

export function internalError(message = "Internal server error") {
  return NextResponse.json(
    { success: false, error: message, code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

/** Parses a ZodError into a user-facing bad-request response. */
export function zodError(error: ZodError) {
  return badRequest("Validation failed", error.flatten().fieldErrors);
}
