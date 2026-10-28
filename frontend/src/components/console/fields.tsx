import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-bg/60 px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-line-strong focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/15 aria-invalid:border-live/60";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium text-fg-muted">
          {label}
          {optional && <span className="ml-1 font-normal text-fg-subtle">(optional)</span>}
        </label>
        {hint && !error && <span className="text-[11px] text-fg-subtle">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-live">
          {error}
        </p>
      )}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "border-brand/50 bg-brand/10 text-fg" : "border-line bg-bg/40 text-fg-muted hover:border-line-strong hover:text-fg",
      )}
      style={active && color ? { borderColor: `color-mix(in oklab, ${color} 55%, transparent)`, background: `color-mix(in oklab, ${color} 12%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}
