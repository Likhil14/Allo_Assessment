/**
 * lib/api-client-ssr.ts
 * Direct DB/service calls for use in Server Components and client-side fetches
 * that need absolute URLs.
 */

import type { ReservationWithDetails } from "@/types";

export async function fetchReservation(id: string): Promise<ReservationWithDetails> {
  const baseUrl =
    typeof window !== "undefined"
      ? ""
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
    cache: "no-store",
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to fetch reservation");
  return json.data as ReservationWithDetails;
}
