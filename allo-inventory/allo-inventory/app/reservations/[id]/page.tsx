/**
 * app/reservations/[id]/page.tsx — Checkout / Reservation Detail Page
 */

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ReservationCheckout } from "@/components/reservations/reservation-checkout";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          }
        >
          <ReservationCheckout reservationId={id} />
        </Suspense>
      </main>
    </div>
  );
}
