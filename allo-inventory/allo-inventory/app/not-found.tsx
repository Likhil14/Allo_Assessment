/**
 * app/not-found.tsx
 */

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { PackageSearch } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-32 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-50">
          <PackageSearch className="h-10 w-10 text-sky-500" />
        </div>
        <h1 className="font-display mt-6 text-4xl text-slate-900">Page Not Found</h1>
        <p className="mt-3 text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild className="mt-8 bg-sky-700 text-white hover:bg-sky-800">
          <Link href="/">Back to Catalogue</Link>
        </Button>
      </main>
    </div>
  )
}
