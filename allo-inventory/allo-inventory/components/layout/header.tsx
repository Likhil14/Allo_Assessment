/**
 * components/layout/header.tsx
 */

import Link from "next/link";
import { Activity, Package } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 shadow-sm">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-display text-xl leading-none text-slate-900">
              AlloStock
            </span>
            <span className="ml-1.5 text-xs text-slate-400">by Allo Health</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Inventory
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Package className="h-4 w-4" />
            Catalogue
          </Link>
        </div>
      </div>
    </header>
  );
}
