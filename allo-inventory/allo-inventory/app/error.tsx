/**
 * app/error.tsx
 * Next.js app-level error boundary (client component).
 */

"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking service in production (e.g. Sentry)
    console.error("[ErrorBoundary]", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="font-display text-2xl text-slate-900">Something went wrong</h2>
      <p className="max-w-sm text-sm text-slate-500">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-slate-300">Ref: {error.digest}</p>
      )}
      <Button
        onClick={reset}
        className="bg-sky-700 text-white hover:bg-sky-800"
      >
        Try again
      </Button>
    </div>
  )
}
