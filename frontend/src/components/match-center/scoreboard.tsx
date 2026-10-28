import { CalendarClock } from "lucide-react";
import { eventStyle } from "@/lib/events";
import {
  deriveStatus,
  durationMinutes,
  formatKickoff,
  formatRelative,
  matchClock,
  matchProgress,
} from "@/lib/match";
import type { Commentary, Match } from "@/lib/types";
import { cn, teamHue } from "@/lib/utils";
import { SportTag, StatusBadge, TeamCrest } from "../ui";

function Team({ name, side, align }: { name: string; side: string; align: "start" | "end" }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:gap-4",
        align === "end" ? "sm:flex-row-reverse sm:text-right" : "sm:text-left",
      )}
    >
      <TeamCrest name={name} size="lg" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">{side}</div>
        <div className="mt-1 font-display text-xl font-bold uppercase leading-tight tracking-wide text-balance sm:text-3xl">
          {name}
        </div>
      </div>
    </div>
  );
}

export function Scoreboard({
  match,
  commentary,
  now,
}: {
  match: Match;
  commentary: Commentary[];
  now: number;
}) {
  const status = deriveStatus(match, now);
  const duration = durationMinutes(match);
  const progress = status === "finished" ? 1 : matchProgress(match, now);
  const keyMoments = commentary.filter((c) => c.minute != null && eventStyle(c.eventType).key);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-surface/80",
        status === "live" ? "border-live/25" : "border-line",
      )}
    >
      {/* Ambient team colours */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(600px 260px at 0% 50%, hsl(${teamHue(match.homeTeam)} 70% 40% / 0.18), transparent 70%), radial-gradient(600px 260px at 100% 50%, hsl(${teamHue(match.awayTeam)} 70% 40% / 0.18), transparent 70%)`,
        }}
      />

      <div className="relative px-5 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SportTag sport={match.sport} />
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <CalendarClock className="size-3.5" />
            {formatKickoff(match.startTime, now)}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          <Team name={match.homeTeam} side="Home" align="start" />

          <div className="flex flex-col items-center">
            {status === "scheduled" ? (
              <>
                <div className="font-display text-4xl font-bold text-fg-subtle sm:text-6xl">VS</div>
                <div className="mt-2 rounded-full bg-upcoming/10 px-3 py-1 text-xs font-medium whitespace-nowrap text-upcoming">
                  {formatRelative(match.startTime, now) || "Upcoming"}
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-center gap-3 font-display text-5xl font-bold tabular-nums sm:gap-5 sm:text-7xl"
                  aria-label={`Score ${match.homeScore} to ${match.awayScore}`}
                >
                  <span>{match.homeScore}</span>
                  <span className="text-fg-subtle">:</span>
                  <span>{match.awayScore}</span>
                </div>
                <div
                  className={cn(
                    "mt-2 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
                    status === "live" ? "bg-live/15 font-mono text-live" : "bg-surface-3 text-fg-muted",
                  )}
                >
                  {status === "live" ? matchClock(match, now) : "Full time"}
                </div>
              </>
            )}
          </div>

          <Team name={match.awayTeam} side="Away" align="end" />
        </div>

        {/* Timeline */}
        <div className="mt-10">
          <div className="relative h-1.5 rounded-full bg-surface-3">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear",
                status === "live" ? "bg-gradient-to-r from-live/60 to-live" : "bg-fg-subtle/60",
              )}
              style={{ width: `${progress * 100}%` }}
            />
            {keyMoments.map((c) => {
              const style = eventStyle(c.eventType);
              const left = Math.min(100, Math.max(0, ((c.minute ?? 0) / duration) * 100));
              return (
                <span
                  key={c.id}
                  title={`${c.minute}' ${style.label}${c.actor ? ` · ${c.actor}` : ""}`}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                  style={{ left: `${left}%`, background: style.color }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-subtle">
            <span>0&prime;</span>
            <span>{Math.round(duration / 2)}&prime;</span>
            <span>{duration}&prime;</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ScoreboardSkeleton() {
  return (
    <div className="rounded-3xl border border-line bg-surface/80 px-5 pt-5 pb-8 sm:px-8" aria-hidden>
      <div className="flex justify-between">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton h-4 w-28" />
      </div>
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="skeleton size-16 rounded-2xl sm:size-20" />
          <div className="skeleton hidden h-7 w-40 sm:block" />
        </div>
        <div className="skeleton h-16 w-36" />
        <div className="flex flex-row-reverse items-center gap-4">
          <div className="skeleton size-16 rounded-2xl sm:size-20" />
          <div className="skeleton hidden h-7 w-40 sm:block" />
        </div>
      </div>
      <div className="skeleton mt-10 h-1.5 w-full" />
    </div>
  );
}
