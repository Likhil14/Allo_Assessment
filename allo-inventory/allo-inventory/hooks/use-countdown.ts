/**
 * hooks/use-countdown.ts
 * Returns remaining seconds until a target date, updated every second.
 */

"use client";

import { useState, useEffect } from "react";

export function useCountdown(expiresAt: string | Date | null): {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  urgency: "normal" | "warning" | "critical";
} {
  const [totalSeconds, setTotalSeconds] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTotalSeconds(remaining);
    };

    tick(); // immediate update
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isExpired = totalSeconds === 0;

  let urgency: "normal" | "warning" | "critical" = "normal";
  if (totalSeconds <= 60) urgency = "critical";
  else if (totalSeconds <= 300) urgency = "warning";

  return { totalSeconds, minutes, seconds, isExpired, urgency };
}
