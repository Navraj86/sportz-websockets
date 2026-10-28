"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { History, RefreshCw, ServerCrash } from "lucide-react";
import { useCommentary } from "@/hooks/use-commentary";
import { useMatches } from "@/hooks/use-matches";
import { useNow } from "@/hooks/use-now";
import { eventStyle } from "@/lib/events";
import { deriveStatus, formatRelative } from "@/lib/match";
import type { Match } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardHeader, EmptyState, buttonClass } from "../ui";
import { CommentaryForm } from "./commentary-form";
import { CreateMatchForm } from "./create-match-form";

function RecentUpdates({ matchId, now }: { matchId: number; now: number }) {
  const { items, state, freshIds } = useCommentary(matchId);
  const recent = items.slice(0, 5);

  return (
    <Card>
      <CardHeader title="Recent updates" description="Latest entries for the selected match." icon={History} />
      {state === "loading" ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-muted">Nothing published for this match yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {recent.map((c) => {
            const style = eventStyle(c.eventType);
            const Icon = style.icon;
            return (
              <li key={c.id} className={cn("relative flex items-start gap-3 px-5 py-3", freshIds.has(c.id) && "animate-enter")}>
                {freshIds.has(c.id) && <span className="pointer-events-none absolute inset-0 animate-flash" />}
                <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-xs font-semibold tabular-nums">
                  {c.minute != null ? `${c.minute}′` : "–"}
                </span>
                <Icon className="mt-0.5 size-4 shrink-0" style={{ color: style.color }} />
                <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">{c.message}</p>
                <span className="shrink-0 text-[11px] text-fg-subtle">{formatRelative(c.createdAt, now)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Prefer the ?match= query param, then the first live match, then the newest match. */
function defaultMatchId(matches: Match[], requested: number | null, now: number): number | null {
  if (requested != null && matches.some((m) => m.id === requested)) return requested;
  return (matches.find((m) => deriveStatus(m, now) === "live") ?? matches[0])?.id ?? null;
}

export function OperatorConsole() {
  const searchParams = useSearchParams();
  const requested = Number(searchParams.get("match")) || null;
  const { matches, state, error, retry, addMatch } = useMatches();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const matchId = selectedId ?? defaultMatchId(matches, requested, now);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Operator console</p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide">Run the broadcast</h1>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">
          Create fixtures and publish play-by-play commentary. Everything you post goes out to every connected viewer
          in real time.
        </p>
      </section>

      {state === "error" ? (
        <EmptyState
          icon={ServerCrash}
          title="Couldn't reach the server"
          description={error ?? "Something went wrong."}
          action={
            <button onClick={retry} className={buttonClass("secondary")}>
              <RefreshCw className="size-4" />
              Try again
            </button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            {state === "loading" ? (
              <div className="skeleton h-140 rounded-2xl" />
            ) : (
              <CommentaryForm matches={matches} matchId={matchId} onMatchChange={setSelectedId} now={now} />
            )}
            {matchId != null && <RecentUpdates key={matchId} matchId={matchId} now={now} />}
          </div>
          <CreateMatchForm
            onCreated={(match) => {
              addMatch(match);
              setSelectedId(match.id);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function OperatorConsoleSkeleton() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="space-y-3">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-10 w-72" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="skeleton h-140 rounded-2xl" />
        <div className="skeleton h-140 rounded-2xl" />
      </div>
    </div>
  );
}
