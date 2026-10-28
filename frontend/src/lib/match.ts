import type { Commentary, Match, MatchStatus } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const toMs = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);

/**
 * The backend stores status at creation time and never updates it, so derive it from
 * the schedule instead (same rules as backend/src/utils/match-status.js).
 */
export function deriveStatus(match: Match, now: number): MatchStatus {
  const start = toMs(match.startTime);
  const end = toMs(match.endTime);
  if (!now || Number.isNaN(start) || Number.isNaN(end)) return match.status;
  if (now < start) return "scheduled";
  if (now >= end) return "finished";
  return "live";
}

export function durationMinutes(match: Match): number {
  const span = toMs(match.endTime) - toMs(match.startTime);
  return Number.isFinite(span) && span > 0 ? Math.round(span / MINUTE) : 90;
}

/** Elapsed fraction of the scheduled window, clamped to [0, 1]. */
export function matchProgress(match: Match, now: number): number {
  const start = toMs(match.startTime);
  const end = toMs(match.endTime);
  if (!now || !(end > start)) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Match clock as "mm:ss" since kick-off. */
export function matchClock(match: Match, now: number): string {
  const elapsed = Math.max(0, now - toMs(match.startTime));
  if (!Number.isFinite(elapsed)) return "--:--";
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function elapsedMinute(match: Match, now: number): number {
  const elapsed = now - toMs(match.startTime);
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / MINUTE)) : 0;
}

export function formatKickoff(iso: string | null, now: number): string {
  if (!iso) return "TBC";
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (!now) return time;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayOffset = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

  if (dayOffset === 0) return `Today, ${time}`;
  if (dayOffset === 1) return `Tomorrow, ${time}`;
  if (dayOffset === -1) return `Yesterday, ${time}`;
  const day = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact relative time: "in 2h 15m", "5m ago", "just now". */
export function formatRelative(iso: string | null, now: number): string {
  if (!iso || !now) return "";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return diff > 0 ? "in under a minute" : "just now";

  let label: string;
  if (abs < HOUR) {
    label = `${Math.round(abs / MINUTE)}m`;
  } else if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.round((abs % HOUR) / MINUTE);
    label = m ? `${h}h ${m}m` : `${h}h`;
  } else {
    label = `${Math.round(abs / DAY)}d`;
  }
  return diff > 0 ? `in ${label}` : `${label} ago`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type TeamSide = "home" | "away" | null;

export function teamSide(match: Match, team: string | null): TeamSide {
  if (!team) return null;
  const t = team.trim().toLowerCase();
  if (t === "home" || t === match.homeTeam.toLowerCase()) return "home";
  if (t === "away" || t === match.awayTeam.toLowerCase()) return "away";
  return null;
}

/** Newest-first feed order: match minute, then sequence, then insertion order. */
export function compareCommentary(a: Commentary, b: Commentary): number {
  return (
    (b.minute ?? -1) - (a.minute ?? -1) ||
    (b.sequence ?? -1) - (a.sequence ?? -1) ||
    b.id - a.id
  );
}

const STATUS_RANK: Record<MatchStatus, number> = { live: 0, scheduled: 1, finished: 2 };

/** Live first (earliest kick-off), then upcoming (soonest), then results (most recent). */
export function compareMatches(a: Match, b: Match, now: number): number {
  const sa = deriveStatus(a, now);
  const sb = deriveStatus(b, now);
  if (sa !== sb) return STATUS_RANK[sa] - STATUS_RANK[sb];
  if (sa === "finished") return toMs(b.endTime) - toMs(a.endTime);
  return toMs(a.startTime) - toMs(b.startTime);
}
