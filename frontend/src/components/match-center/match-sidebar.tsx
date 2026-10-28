import Link from "next/link";
import { BarChart3, Info, Megaphone } from "lucide-react";
import { eventStyle, normalizeEventType } from "@/lib/events";
import { deriveStatus, durationMinutes, formatDateTime, formatDuration, teamSide } from "@/lib/match";
import type { Commentary, Match } from "@/lib/types";
import { Card, CardHeader, buttonClass } from "../ui";

const STATUS_LABEL = { live: "In progress", scheduled: "Scheduled", finished: "Finished" } as const;

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-medium text-fg">{value}</dd>
    </div>
  );
}

function StatBar({ label, color, home, away }: { label: string; color: string; home: number; away: number }) {
  const total = home + away;
  const homePct = total ? (home / total) * 100 : 50;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="w-6 font-semibold tabular-nums">{home}</span>
        <span className="text-xs text-fg-muted">{label}</span>
        <span className="w-6 text-right font-semibold tabular-nums">{away}</span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full" style={{ width: `${total ? homePct : 0}%`, background: color }} />
        </div>
        <div className="flex-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full"
            style={{ width: `${total ? 100 - homePct : 0}%`, background: color, opacity: 0.6 }}
          />
        </div>
      </div>
    </div>
  );
}

/** Tallies events per team side, for event types attributed to one of the two teams. */
function eventStats(match: Match, commentary: Commentary[]) {
  const tally = new Map<string, { home: number; away: number }>();
  for (const c of commentary) {
    const side = teamSide(match, c.team);
    if (!side) continue;
    const key = normalizeEventType(c.eventType);
    const row = tally.get(key) ?? { home: 0, away: 0 };
    row[side]++;
    tally.set(key, row);
  }
  return [...tally.entries()]
    .map(([type, counts]) => ({ type, ...counts, style: eventStyle(type) }))
    .sort((a, b) => Number(b.style.key) - Number(a.style.key) || b.home + b.away - (a.home + a.away))
    .slice(0, 6);
}

export function MatchSidebar({ match, commentary, now }: { match: Match; commentary: Commentary[]; now: number }) {
  const status = deriveStatus(match, now);
  const stats = eventStats(match, commentary);

  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader title="Match facts" icon={Info} />
        <dl className="divide-y divide-line px-5 py-1">
          <Fact label="Sport" value={<span className="capitalize">{match.sport}</span>} />
          <Fact label="Status" value={now ? STATUS_LABEL[status] : "—"} />
          <Fact label="Kick-off" value={formatDateTime(match.startTime)} />
          <Fact label="Final whistle" value={formatDateTime(match.endTime)} />
          <Fact label="Duration" value={formatDuration(durationMinutes(match))} />
          <Fact label="Updates" value={commentary.length} />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Event stats" description={`${match.homeTeam} vs ${match.awayTeam}`} icon={BarChart3} />
        <div className="space-y-4 px-5 py-5">
          {stats.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Stats build up as commentary events are tagged with a team.
            </p>
          ) : (
            stats.map((s) => (
              <StatBar key={s.type} label={s.style.label} color={s.style.color} home={s.home} away={s.away} />
            ))
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            <Megaphone className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Covering this match?</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Publish play-by-play updates from the console. Fans see them here instantly.
            </p>
            <Link href={`/console?match=${match.id}`} className={buttonClass("secondary", "sm", "mt-4")}>
              Open console
            </Link>
          </div>
        </div>
      </Card>
    </aside>
  );
}
