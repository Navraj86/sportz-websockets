"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radio, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ConnectionStatus, useRealtime } from "./realtime-provider";

const NAV = [
  { href: "/", label: "Matches", icon: LayoutGrid },
  { href: "/console", label: "Console", icon: Radio },
] as const;

const STATUS_COPY: Record<ConnectionStatus, { label: string; className: string }> = {
  open: { label: "Live", className: "text-success" },
  connecting: { label: "Connecting", className: "text-warning" },
  reconnecting: { label: "Reconnecting", className: "text-warning" },
  offline: { label: "Offline", className: "text-live" },
};

function ConnectionPill() {
  const { status } = useRealtime();
  const { label, className } = STATUS_COPY[status];
  return (
    <div
      role="status"
      aria-live="polite"
      title={status === "open" ? "Receiving real-time updates" : "Real-time updates paused"}
      className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-muted"
    >
      <span className={cn("relative flex size-2", className)}>
        {status === "open" && (
          <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-current" />
        )}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function NavLinks({ activeHref }: { activeHref: string | null }) {
  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={activeHref === href ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            activeHref === href ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

// usePathname() is runtime data on dynamic routes, so it lives behind its own Suspense boundary.
function ActiveNavLinks() {
  const pathname = usePathname();
  const active = NAV.find(({ href }) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/matches") : pathname.startsWith(href),
  );
  return <NavLinks activeHref={active?.href ?? null} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="Sportz home">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg shadow-[0_0_24px_-4px_var(--brand)] transition-transform group-hover:-rotate-6">
              <Zap className="size-4.5 fill-current" />
            </span>
            <span className="font-display text-xl font-bold uppercase tracking-[0.12em]">Sportz</span>
          </Link>

          <Suspense fallback={<NavLinks activeHref={null} />}>
            <ActiveNavLinks />
          </Suspense>
        </div>

        <ConnectionPill />
      </div>
    </header>
  );
}
