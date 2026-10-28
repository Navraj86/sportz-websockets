import Link from "next/link";
import { ArrowUpRight, CalendarClock, Flag } from "lucide-react";
import {
  deriveStatus,
  elapsedMinute,
  formatKickoff,
  formatRelative,
  matchProgress,
} from "@/lib/match";
import type { Match } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProgressBar, SportTag, StatusBadge, TeamCrest } from "./ui";

function TeamRow({
  name,
  score,
  showScore,
  dimmed,
}: {
  name: string;
  score: number;
  showScore: boolean;
  dimmed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <TeamCrest name={name} size="sm" />
        <span className={cn("truncate text-[15px] font-semibold", dimmed ? "text-fg-muted" : "text-fg")}>
          {name}
        </span>
      </div>
      {showScore ? (
        <span
          className={cn(
            "font-display text-2xl font-bold tabular-nums leading-none",
            dimmed ? "text-fg-subtle" : "text-fg",
          )}
        >
          {score}
        </span>
      ) : (
        <span className="font-display text-2xl leading-none text-fg-subtle">–</span>
      )}
    </div>
  );
}

export function MatchCard({ match, now, fresh }: { match: Match; now: number; fresh?: boolean }) {
  const status = deriveStatus(match, now);
  const isLive = status === "live";
  const isFinished = status === "finished";
  const homeWins = match.homeScore > match.awayScore;
  const awayWins = match.awayScore > match.homeScore;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-surface/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2/80 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]",
        isLive ? "border-live/25 hover:border-live/50" : "border-line hover:border-line-strong",
        fresh && "animate-enter",
      )}
    >
      {isLive && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-live/70 to-transparent" />
      )}
      {fresh && <span className="pointer-events-none absolute inset-0 animate-flash" />}

      <div className="flex items-center justify-between gap-2">
        <SportTag sport={match.sport} />
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <ArrowUpRight className="size-4 -translate-x-1 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <TeamRow
          name={match.homeTeam}
          score={match.homeScore}
          showScore={status !== "scheduled"}
          dimmed={isFinished && awayWins}
        />
        <TeamRow
          name={match.awayTeam}
          score={match.awayScore}
          showScore={status !== "scheduled"}
          dimmed={isFinished && homeWins}
        />
      </div>

      <div className="mt-5 border-t border-line pt-4 text-xs text-fg-muted">
        {isLive ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-live">{elapsedMinute(match, now)}&prime;</span>
              <span>Started {formatRelative(match.startTime, now)}</span>
            </div>
            <ProgressBar value={matchProgress(match, now)} />
          </div>
        ) : isFinished ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flag className="size-3.5" />
              {formatKickoff(match.startTime, now)}
            </span>
            <span>Ended {formatRelative(match.endTime, now)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {formatKickoff(match.startTime, now)}
            </span>
            <span className="font-medium text-upcoming">{formatRelative(match.startTime, now)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-5" aria-hidden>
      <div className="flex justify-between">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="mt-5 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton size-8" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-6 w-5" />
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="skeleton h-3.5 w-full" />
      </div>
    </div>
  );
}
