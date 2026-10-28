"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Flag, Plus, RefreshCw, Search, ServerCrash, Trophy, X } from "lucide-react";
import { useMatches } from "@/hooks/use-matches";
import { useNow } from "@/hooks/use-now";
import { compareMatches, deriveStatus } from "@/lib/match";
import type { Match, MatchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MatchCard, MatchCardSkeleton } from "./match-card";
import { EmptyState, LiveDot, buttonClass } from "./ui";

type Filter = "all" | MatchStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Upcoming" },
  { value: "finished", label: "Results" },
];

const SECTIONS: { status: MatchStatus; title: string }[] = [
  { status: "live", title: "Live now" },
  { status: "scheduled", title: "Upcoming" },
  { status: "finished", title: "Results" },
];

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3">
      <span className={cn("grid size-9 place-items-center rounded-lg bg-surface-2", accent)}>{icon}</span>
      <div>
        <div className="font-display text-2xl font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">{label}</div>
      </div>
    </div>
  );
}

function MatchGrid({ matches, now, freshIds }: { matches: Match[]; now: number; freshIds: ReadonlySet<number> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} now={now} fresh={freshIds.has(match.id)} />
      ))}
    </div>
  );
}

export function Dashboard() {
  const { matches, state, error, freshIds, retry } = useMatches();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");
  const [sport, setSport] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const withStatus = useMemo(
    () =>
      [...matches]
        .sort((a, b) => compareMatches(a, b, now))
        .map((match) => ({ match, status: deriveStatus(match, now) })),
    [matches, now],
  );

  const sports = useMemo(
    () => [...new Set(matches.map((m) => m.sport))].sort((a, b) => a.localeCompare(b)),
    [matches],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, live: 0, scheduled: 0, finished: 0 };
    for (const { match, status } of withStatus) {
      if (sport && match.sport !== sport) continue;
      c.all++;
      c[status]++;
    }
    return c;
  }, [withStatus, sport]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter(({ match, status }) => {
      if (filter !== "all" && status !== filter) return false;
      if (sport && match.sport !== sport) return false;
      if (q && !`${match.homeTeam} ${match.awayTeam} ${match.sport}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [withStatus, filter, sport, query]);

  const isFiltered = filter !== "all" || sport !== null || query.trim() !== "";
  const clearFilters = () => {
    setFilter("all");
    setSport(null);
    setQuery("");
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Match centre</p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
            Every match. <span className="text-fg-muted">Live.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-fg-muted">
            Scores, fixtures and play-by-play commentary, updated as it happens.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-105">
          <StatTile label="Live" value={state === "ready" ? counts.live : "–"} icon={<LiveDot />} accent="text-live" />
          <StatTile
            label="Upcoming"
            value={state === "ready" ? counts.scheduled : "–"}
            icon={<CalendarClock className="size-4" />}
            accent="text-upcoming"
          />
          <StatTile
            label="Results"
            value={state === "ready" ? counts.finished : "–"}
            icon={<Flag className="size-4" />}
            accent="text-fg-muted"
          />
        </div>
      </section>

      {/* Toolbar */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Match status" className="scrollbar-none flex w-fit max-w-full overflow-x-auto rounded-xl border border-line bg-surface p-1">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === value ? "bg-surface-3 text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {value === "live" && counts.live > 0 && <LiveDot className="text-live" />}
                {label}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[11px] tabular-nums",
                    filter === value ? "bg-bg/60 text-fg" : "bg-surface-2 text-fg-subtle",
                  )}
                >
                  {state === "ready" ? counts[value] : "·"}
                </span>
              </button>
            ))}
          </div>

          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams or sports"
              aria-label="Search matches"
              className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-fg-subtle focus:border-line-strong focus:outline-none"
            />
          </div>
        </div>

        {sports.length > 1 && (
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <SportChip active={sport === null} onClick={() => setSport(null)}>
              All sports
            </SportChip>
            {sports.map((s) => (
              <SportChip key={s} active={sport === s} onClick={() => setSport(sport === s ? null : s)}>
                {s}
              </SportChip>
            ))}
          </div>
        )}
      </section>

      {/* Content */}
      {state === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      )}

      {state === "error" && (
        <EmptyState
          icon={ServerCrash}
          title="Couldn't load matches"
          description={error ?? "Something went wrong."}
          action={
            <button onClick={retry} className={buttonClass("secondary")}>
              <RefreshCw className="size-4" />
              Try again
            </button>
          }
        />
      )}

      {state === "ready" && matches.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="No matches yet"
          description="Create your first fixture from the operator console. It will appear here instantly for every viewer."
          action={
            <Link href="/console" className={buttonClass("primary")}>
              <Plus className="size-4" />
              Create a match
            </Link>
          }
        />
      )}

      {state === "ready" && matches.length > 0 && visible.length === 0 && (
        <EmptyState
          icon={Search}
          title="No matches found"
          description="Nothing matches the current filters. Try a different status, sport or search term."
          action={
            <button onClick={clearFilters} className={buttonClass("secondary")}>
              <X className="size-4" />
              Clear filters
            </button>
          }
        />
      )}

      {state === "ready" && visible.length > 0 &&
        (filter === "all" ? (
          <div className="space-y-10">
            {SECTIONS.map(({ status, title }) => {
              const group = visible.filter((v) => v.status === status).map((v) => v.match);
              if (group.length === 0) return null;
              return (
                <section key={status} aria-labelledby={`section-${status}`}>
                  <div className="mb-4 flex items-center gap-3">
                    {status === "live" && <LiveDot className="text-live" />}
                    <h2 id={`section-${status}`} className="text-sm font-semibold uppercase tracking-wider text-fg">
                      {title}
                    </h2>
                    <span className="text-sm text-fg-subtle">{group.length}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <MatchGrid matches={group} now={now} freshIds={freshIds} />
                </section>
              );
            })}
          </div>
        ) : (
          <MatchGrid matches={visible.map((v) => v.match)} now={now} freshIds={freshIds} />
        ))}

      {state === "ready" && matches.length > 0 && isFiltered && visible.length > 0 && (
        <p className="text-center text-xs text-fg-subtle">
          Showing {visible.length} of {matches.length} matches ·{" "}
          <button onClick={clearFilters} className="underline-offset-2 hover:text-fg hover:underline">
            Clear filters
          </button>
        </p>
      )}
    </div>
  );
}

function SportChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
