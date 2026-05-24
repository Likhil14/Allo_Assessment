/**
 * components/reservations/countdown-timer.tsx
 */

"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  minutes: number;
  seconds: number;
  urgency: "normal" | "warning" | "critical";
  expiresAt: string;
}

export function CountdownTimer({ minutes, seconds, urgency }: Props) {
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl p-5 transition-colors duration-1000",
        urgency === "normal" && "border border-sky-100 bg-sky-50",
        urgency === "warning" && "border border-amber-100 bg-amber-50",
        urgency === "critical" && "border border-red-200 bg-red-50 animate-pulse"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
          urgency === "normal" && "bg-sky-100 text-sky-700",
          urgency === "warning" && "bg-amber-100 text-amber-700",
          urgency === "critical" && "bg-red-100 text-red-600"
        )}
      >
        <Clock className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            urgency === "normal" && "text-sky-700",
            urgency === "warning" && "text-amber-700",
            urgency === "critical" && "text-red-700"
          )}
        >
          {urgency === "critical"
            ? "Expiring very soon!"
            : urgency === "warning"
            ? "Reservation expiring soon"
            : "Reservation held for"}
        </p>
        <p
          className={cn(
            "font-display text-3xl tabular-nums tracking-tight",
            urgency === "normal" && "text-sky-900",
            urgency === "warning" && "text-amber-900",
            urgency === "critical" && "text-red-800"
          )}
        >
          {pad(minutes)}:{pad(seconds)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400">Stock held</p>
        <p className="text-xs text-slate-400">exclusively for you</p>
      </div>
    </div>
  );
}
