import type { LucideIcon } from "lucide-react";
import { cn, initials, teamHue } from "@/lib/utils";
import type { MatchStatus } from "@/lib/types";

/* ---------- Buttons ---------- */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS = {
  primary: "bg-brand text-brand-fg hover:bg-brand/90 shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_8px_24px_-8px_var(--brand)]",
  secondary: "bg-surface-2 text-fg border border-line hover:border-line-strong hover:bg-surface-3",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
} as const;

export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = "primary",
  size: keyof typeof BUTTON_SIZES = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

/* ---------- Surfaces ---------- */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface/80 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-fg-muted">
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Status ---------- */

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-live-ping rounded-full bg-current" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}

export function StatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  if (status === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[11px] font-bold tracking-wider text-live ring-1 ring-live/30",
          className,
        )}
      >
        <LiveDot />
        LIVE
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-upcoming/10 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-upcoming ring-1 ring-upcoming/25",
          className,
        )}
      >
        UPCOMING
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-fg-muted ring-1 ring-line-strong",
        className,
      )}
    >
      FULL TIME
    </span>
  );
}

export function SportTag({ sport, className }: { sport: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted",
        className,
      )}
    >
      {sport}
    </span>
  );
}

/* ---------- Teams ---------- */

const CREST_SIZES = {
  sm: "size-8 text-[10px] rounded-lg",
  md: "size-10 text-xs rounded-xl",
  lg: "size-16 text-base rounded-2xl sm:size-20 sm:text-lg",
} as const;

export function TeamCrest({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof CREST_SIZES;
  className?: string;
}) {
  const hue = teamHue(name);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-display font-bold tracking-wide text-white",
        CREST_SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 70% 42%), hsl(${(hue + 30) % 360} 65% 22%))`,
        boxShadow: `inset 0 1px 0 hsl(${hue} 80% 70% / 0.35), 0 0 0 1px hsl(${hue} 60% 50% / 0.35)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Feedback ---------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-fg-muted">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn("h-1 overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-live/70 to-live transition-[width] duration-1000 ease-linear"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}
