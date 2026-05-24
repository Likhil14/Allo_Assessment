/**
 * app/admin/page.tsx — Admin Dashboard
 * Shows aggregate stats, low-stock alerts, and recent reservations.
 */

import { Header } from "@/components/layout/header"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            Operations
          </p>
          <h1 className="font-display mt-2 text-4xl text-slate-900">
            Inventory Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Real-time overview of stock levels, reservations, and system health.
          </p>
        </div>
        <AdminDashboard />
      </main>
    </div>
  )
}
