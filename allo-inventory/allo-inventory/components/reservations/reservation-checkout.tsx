/**
 * components/reservations/reservation-checkout.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  MapPin,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountdownTimer } from "./countdown-timer";
import { useCountdown } from "@/hooks/use-countdown";
import { useConfirmReservation, useReleaseReservation } from "@/hooks/use-reservations";
import { fetchReservation } from "@/lib/api-client-ssr";
import { ApiError } from "@/lib/api-client";
import type { ReservationWithDetails } from "@/types";
import Link from "next/link";

interface Props {
  reservationId: string;
}

export function ReservationCheckout({ reservationId }: Props) {
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: confirm, isPending: isConfirming } = useConfirmReservation();
  const { mutateAsync: release, isPending: isReleasing } = useReleaseReservation();

  const { minutes, seconds, isExpired, urgency } = useCountdown(
    reservation?.expiresAt ?? null
  );

  // Fetch reservation on mount
  useEffect(() => {
    fetchReservation(reservationId)
      .then(setReservation)
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [reservationId]);

  const handleConfirm = async () => {
    try {
      const updated = await confirm(reservationId);
      setReservation({
        ...updated,
        product: { ...updated.product, price: updated.product.price },
      } as ReservationWithDetails);
      toast.success("Purchase confirmed!", {
        description: `Your order for ${updated.product.name} is placed.`,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 410) {
          toast.error("Reservation expired", {
            description: "Your reservation has expired. Please start over.",
          });
          setReservation((r) => r ? { ...r, status: "EXPIRED" } : r);
        } else {
          toast.error("Confirmation failed", { description: error.message });
        }
      }
    }
  };

  const handleRelease = async () => {
    try {
      await release(reservationId);
      toast.info("Reservation cancelled.");
      router.push("/");
    } catch {
      toast.error("Failed to cancel reservation.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 font-semibold text-red-800">Reservation not found</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Back to Catalogue</Link>
        </Button>
      </div>
    );
  }

  const isCompleted =
    reservation.status === "CONFIRMED" || reservation.status === "RELEASED";
  const isEffectivelyExpired =
    reservation.status === "EXPIRED" || (reservation.status === "PENDING" && isExpired);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Catalogue
      </Link>

      {/* Status header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
          Reservation #{reservation.id.slice(-8).toUpperCase()}
        </p>
        <h1 className="font-display mt-1 text-3xl text-slate-900">
          {reservation.status === "CONFIRMED"
            ? "Order Confirmed"
            : reservation.status === "RELEASED"
            ? "Reservation Cancelled"
            : isEffectivelyExpired
            ? "Reservation Expired"
            : "Complete Your Purchase"}
        </h1>
      </div>

      {/* Timer (only for active reservations) */}
      {reservation.status === "PENDING" && !isEffectivelyExpired && (
        <CountdownTimer
          minutes={minutes}
          seconds={seconds}
          urgency={urgency}
          expiresAt={reservation.expiresAt}
        />
      )}

      {/* Expiry banner */}
      {isEffectivelyExpired && reservation.status !== "RELEASED" && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-800">Reservation Expired</p>
            <p className="text-sm text-red-600">
              This reservation has expired. The inventory has been released.
            </p>
          </div>
        </div>
      )}

      {/* Order summary card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-700">
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-50 to-slate-100">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{reservation.product.name}</p>
              <p className="text-xs font-mono text-slate-400">{reservation.product.sku}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {reservation.warehouse.name} · {reservation.warehouse.location}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">Unit Price</span>
              <span>₹{Number(reservation.product.price).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">Quantity</span>
              <span>{reservation.quantity}</span>
            </div>
            <div className="flex justify-between py-2.5 text-base font-bold">
              <span className="text-slate-800">Total</span>
              <span className="text-sky-700">
                ₹{(Number(reservation.product.price) * reservation.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status:</span>
            <StatusBadge status={reservation.status} isExpired={isEffectivelyExpired} />
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {reservation.status === "PENDING" && !isEffectivelyExpired && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={handleRelease}
            disabled={isReleasing || isConfirming}
          >
            {isReleasing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-700 text-white hover:bg-sky-800"
            onClick={handleConfirm}
            disabled={isConfirming || isReleasing}
          >
            {isConfirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirm Purchase
          </Button>
        </div>
      )}

      {reservation.status === "CONFIRMED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 font-semibold text-emerald-800">
            Order placed successfully!
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Your medication will be dispatched within 24 hours.
          </p>
          <Button asChild className="mt-4 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link href="/">Back to Catalogue</Link>
          </Button>
        </div>
      )}

      {(reservation.status === "RELEASED" || isEffectivelyExpired) && (
        <Button asChild className="w-full bg-sky-700 text-white hover:bg-sky-800">
          <Link href="/">Browse Catalogue</Link>
        </Button>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  isExpired,
}: {
  status: string;
  isExpired: boolean;
}) {
  if (isExpired || status === "EXPIRED") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        Expired
      </span>
    );
  }
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
