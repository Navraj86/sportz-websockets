"use client";

import { useState } from "react";
import { MessageSquareText, RefreshCw, ServerCrash, Sparkles } from "lucide-react";
import { eventStyle } from "@/lib/events";
import { formatRelative } from "@/lib/match";
import type { Commentary, Match } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRealtime } from "../realtime-provider";
import { EmptyState, LiveDot, buttonClass } from "../ui";

type View = "all" | "key";

function FeedItem({ entry, now, fresh }: { entry: Commentary; now: number; fresh: boolean }) {
  const style = eventStyle(entry.eventType);
  const Icon = style.icon;
  const meta = [entry.actor, entry.team].filter(Boolean).join(" · ");

  return (
    <li className={cn("relative flex gap-4 px-5 py-4", fresh && "animate-enter")}>
      {fresh && <span className="pointer-events-none absolute inset-0 animate-flash" />}

      <div className="w-10 shrink-0 pt-1.5 text-right font-mono text-sm font-semibold tabular-nums text-fg">
        {entry.minute != null ? `${entry.minute}′` : "–"}
      </div>

      <div className="relative flex flex-col items-center">
        <span
          className="z-10 grid size-8 place-items-center rounded-full border bg-surface"
          style={{
            color: style.color,
            borderColor: `color-mix(in oklab, ${style.color} 40%, transparent)`,
            background: `color-mix(in oklab, ${style.color} 12%, var(--surface))`,
          }}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn("text-xs font-bold uppercase tracking-wider", !style.key && "text-fg-muted")}
            style={style.key ? { color: style.color } : undefined}
          >
            {style.label}
          </span>
          {entry.period && (
            <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              {entry.period}
            </span>
          )}
          <span className="ml-auto text-[11px] text-fg-subtle" title={new Date(entry.createdAt).toLocaleString()}>
            {formatRelative(entry.createdAt, now)}
          </span>
        </div>
        {meta && <div className="mt-0.5 text-sm font-medium text-fg">{meta}</div>}
        <p className={cn("mt-1 text-sm leading-relaxed text-fg-muted", style.key && "text-fg/85")}>
          {entry.message}
        </p>
        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-fg-subtle">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function CommentaryFeed({
  match,
  items,
  state,
  error,
  freshIds,
  retry,
  now,
  isLive,
}: {
  match: Match;
  items: Commentary[];
  state: "loading" | "ready" | "error";
  error: string | null;
  freshIds: ReadonlySet<number>;
  retry: () => void;
  now: number;
  isLive: boolean;
}) {
  const [view, setView] = useState<View>("all");
  const { status } = useRealtime();
  const visible = view === "key" ? items.filter((c) => eventStyle(c.eventType).key) : items;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface/80" aria-labelledby="feed-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 id="feed-title" className="text-sm font-semibold">
            Live commentary
          </h2>
          {status === "open" ? (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <LiveDot />
              {isLive ? "Live updates" : "Connected"}
            </span>
          ) : (
            <span className="text-xs text-warning">Reconnecting…</span>
          )}
        </div>
        <div role="tablist" aria-label="Commentary filter" className="flex rounded-lg border border-line bg-bg/50 p-0.5">
          {(
            [
              ["all", "All events"],
              ["key", "Key moments"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === value ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {state === "loading" && (
        <ul aria-hidden className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex gap-4 px-5 py-4">
              <div className="skeleton h-4 w-10" />
              <div className="skeleton size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {state === "error" && (
        <EmptyState
          className="m-5"
          icon={ServerCrash}
          title="Couldn't load commentary"
          description={error ?? "Something went wrong."}
          action={
            <button onClick={retry} className={buttonClass("secondary", "sm")}>
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          }
        />
      )}

      {state === "ready" && visible.length === 0 && (
        <EmptyState
          className="m-5"
          icon={view === "key" ? Sparkles : MessageSquareText}
          title={view === "key" ? "No key moments yet" : "No commentary yet"}
          description={
            view === "key"
              ? "Goals, cards and other big moments will be pinned here."
              : `Updates for ${match.homeTeam} vs ${match.awayTeam} will stream in here the moment they're published.`
          }
        />
      )}

      {state === "ready" && visible.length > 0 && (
        <ol className="divide-y divide-line" aria-live="polite" aria-relevant="additions">
          {visible.map((entry) => (
            <FeedItem key={entry.id} entry={entry} now={now} fresh={freshIds.has(entry.id)} />
          ))}
        </ol>
      )}
    </section>
  );
}
