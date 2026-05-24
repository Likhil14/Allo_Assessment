/**
 * components/admin/admin-dashboard.tsx
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Package,
  Warehouse,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "@/lib/date-utils"

interface Stats {
  totalProducts: number
  totalWarehouses: number
  reservations: {
    pending: number
    confirmed: number
    released: number
    expired: number
    total: number
  }
  lowStockItems: Array<{
    productName: string
    warehouseName: string
    availableUnits: number
    totalUnits: number
  }>
  recentReservations: Array<{
    id: string
    productName: string
    sku: string
    warehouseName: string
    quantity: number
    status: string
    createdAt: string
    expiresAt: string
  }>
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats", { cache: "no-store" })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  RELEASED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-red-100 text-red-700",
}

export function AdminDashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  })

  if (isLoading) return <AdminSkeleton />

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 font-semibold text-red-800">Failed to load dashboard</p>
        <Button
          variant="outline"
          className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
          onClick={() => refetch()}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const stats = data!

  return (
    <div className="space-y-8">
      {/* Refresh indicator */}
      {isFetching && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Package className="h-5 w-5 text-sky-600" />}
          label="Total Products"
          value={stats.totalProducts}
          bg="bg-sky-50"
        />
        <KpiCard
          icon={<Warehouse className="h-5 w-5 text-violet-600" />}
          label="Warehouses"
          value={stats.totalWarehouses}
          bg="bg-violet-50"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Active Reservations"
          value={stats.reservations.pending}
          bg="bg-amber-50"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Confirmed Orders"
          value={stats.reservations.confirmed}
          bg="bg-emerald-50"
        />
      </div>

      {/* ── Reservation breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reservation status breakdown */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Activity className="h-4 w-4 text-sky-600" />
              Reservation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["PENDING", stats.reservations.pending, "Awaiting confirmation"],
                ["CONFIRMED", stats.reservations.confirmed, "Purchase completed"],
                ["RELEASED", stats.reservations.released, "Cancelled by user"],
                ["EXPIRED", stats.reservations.expired, "TTL exceeded"],
              ] as const
            ).map(([status, count, label]) => (
              <div key={status} className="flex items-center gap-3">
                <span
                  className={`w-24 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${statusColors[status]}`}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
                <div className="flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status === "PENDING"
                        ? "bg-amber-400"
                        : status === "CONFIRMED"
                        ? "bg-emerald-400"
                        : status === "RELEASED"
                        ? "bg-slate-400"
                        : "bg-red-400"
                    }`}
                    style={{
                      width:
                        stats.reservations.total > 0
                          ? `${(count / stats.reservations.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums text-slate-700">
                  {count}
                </span>
                <span className="hidden text-xs text-slate-400 sm:block">{label}</span>
              </div>
            ))}
            <p className="pt-1 text-right text-xs text-slate-400">
              Total: {stats.reservations.total}
            </p>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                All stock levels healthy ✓
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">
                        {item.productName}
                      </p>
                      <p className="text-xs text-slate-400">{item.warehouseName}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          item.availableUnits === 0
                            ? "text-slate-400"
                            : item.availableUnits <= 2
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {item.availableUnits === 0
                          ? "Out of stock"
                          : `${item.availableUnits} left`}
                      </p>
                      <p className="text-xs text-slate-400">
                        of {item.totalUnits} total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent reservations table ── */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock className="h-4 w-4 text-sky-600" />
            Recent Reservations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["ID", "Product", "Warehouse", "Qty", "Status", "Created"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No reservations yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        #{r.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 leading-tight">
                          {r.productName}
                        </p>
                        <p className="text-xs text-slate-400">{r.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.warehouseName}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-700">
                        {r.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDistanceToNow(r.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
}) {
  return (
    <Card className="border border-slate-200 bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
