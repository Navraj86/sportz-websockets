"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trophy } from "lucide-react";
import { ApiError, createMatch, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/match";
import type { Match } from "@/lib/types";
import { Card, CardHeader, buttonClass } from "../ui";
import { Chip, Field, inputClass } from "./fields";

const SPORTS: { name: string; minutes: number }[] = [
  { name: "Football", minutes: 105 },
  { name: "Basketball", minutes: 120 },
  { name: "Cricket", minutes: 210 },
  { name: "Tennis", minutes: 150 },
  { name: "Rugby", minutes: 100 },
  { name: "Ice Hockey", minutes: 150 },
];

const MINUTE = 60_000;

/** Formats a Date for <input type="datetime-local"> in the user's local time zone. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sportMinutes(sport: string) {
  return SPORTS.find((s) => s.name.toLowerCase() === sport.trim().toLowerCase())?.minutes ?? 90;
}

const EMPTY = { sport: "Football", homeTeam: "", awayTeam: "", start: "", end: "", homeScore: "", awayScore: "" };

export function CreateMatchForm({ onCreated }: { onCreated: (match: Match) => void }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const applyPreset = (startOffsetMinutes: number | "tomorrow") => {
    let start: Date;
    if (startOffsetMinutes === "tomorrow") {
      start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(19, 0, 0, 0);
    } else {
      start = new Date(Date.now() + startOffsetMinutes * MINUTE);
      start.setSeconds(0, 0);
    }
    const end = new Date(start.getTime() + sportMinutes(form.sport) * MINUTE);
    setForm((f) => ({ ...f, start: toLocalInput(start), end: toLocalInput(end) }));
    setErrors((e) => ({ ...e, startTime: "", endTime: "" }));
  };

  const span = form.start && form.end ? (new Date(form.end).getTime() - new Date(form.start).getTime()) / MINUTE : 0;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.sport.trim()) next.sport = "Choose a sport.";
    if (!form.homeTeam.trim()) next.homeTeam = "Enter the home team.";
    if (!form.awayTeam.trim()) next.awayTeam = "Enter the away team.";
    if (form.homeTeam.trim() && form.homeTeam.trim().toLowerCase() === form.awayTeam.trim().toLowerCase()) {
      next.awayTeam = "Teams must be different.";
    }
    if (!form.start) next.startTime = "Pick a start time.";
    if (!form.end) next.endTime = "Pick an end time.";
    else if (form.start && span <= 0) next.endTime = "End must be after the start.";
    return next;
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clientErrors = validate();
    if (Object.values(clientErrors).some(Boolean)) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const match = await createMatch({
        sport: form.sport.trim(),
        homeTeam: form.homeTeam.trim(),
        awayTeam: form.awayTeam.trim(),
        startTime: new Date(form.start).toISOString(),
        endTime: new Date(form.end).toISOString(),
        homeScore: form.homeScore ? Number(form.homeScore) : undefined,
        awayScore: form.awayScore ? Number(form.awayScore) : undefined,
      });
      onCreated(match);
      toast.success(`${match.homeTeam} vs ${match.awayTeam} created`, {
        id: `match-${match.id}`,
        description: "Broadcast to all connected viewers.",
        action: { label: "View", onClick: () => router.push(`/matches/${match.id}`) },
      });
      setForm((f) => ({ ...EMPTY, sport: f.sport }));
      setErrors({});
    } catch (error) {
      if (error instanceof ApiError && error.issues.length) setErrors(error.fieldErrors());
      toast.error("Couldn't create match", { description: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="New match" description="Schedule a fixture or start one live." icon={Trophy} />
      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
        <Field label="Sport" htmlFor="sport" error={errors.sport}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SPORTS.map(({ name }) => (
              <Chip key={name} active={form.sport === name} onClick={() => set("sport")(name)}>
                {name}
              </Chip>
            ))}
          </div>
          <input
            id="sport"
            value={form.sport}
            onChange={(e) => set("sport")(e.target.value)}
            placeholder="Or type another sport"
            aria-invalid={!!errors.sport}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Home team" htmlFor="homeTeam" error={errors.homeTeam}>
            <input
              id="homeTeam"
              value={form.homeTeam}
              onChange={(e) => set("homeTeam")(e.target.value)}
              placeholder="e.g. Arsenal"
              aria-invalid={!!errors.homeTeam}
              className={inputClass}
            />
          </Field>
          <Field label="Away team" htmlFor="awayTeam" error={errors.awayTeam}>
            <input
              id="awayTeam"
              value={form.awayTeam}
              onChange={(e) => set("awayTeam")(e.target.value)}
              placeholder="e.g. Chelsea"
              aria-invalid={!!errors.awayTeam}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-fg-muted">Quick schedule</span>
            <Chip active={false} onClick={() => applyPreset(0)}>
              Start now
            </Chip>
            <Chip active={false} onClick={() => applyPreset(30)}>
              In 30 min
            </Chip>
            <Chip active={false} onClick={() => applyPreset("tomorrow")}>
              Tomorrow 19:00
            </Chip>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start" htmlFor="start" error={errors.startTime}>
              <input
                id="start"
                type="datetime-local"
                value={form.start}
                onChange={(e) => {
                  set("start")(e.target.value);
                  setErrors((er) => ({ ...er, startTime: "" }));
                }}
                aria-invalid={!!errors.startTime}
                className={inputClass}
              />
            </Field>
            <Field
              label="End"
              htmlFor="end"
              error={errors.endTime}
              hint={span > 0 ? formatDuration(Math.round(span)) : undefined}
            >
              <input
                id="end"
                type="datetime-local"
                value={form.end}
                min={form.start || undefined}
                onChange={(e) => {
                  set("end")(e.target.value);
                  setErrors((er) => ({ ...er, endTime: "" }));
                }}
                aria-invalid={!!errors.endTime}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Home score" htmlFor="homeScore" optional error={errors.homeScore}>
            <input
              id="homeScore"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.homeScore}
              onChange={(e) => set("homeScore")(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <Field label="Away score" htmlFor="awayScore" optional error={errors.awayScore}>
            <input
              id="awayScore"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.awayScore}
              onChange={(e) => set("awayScore")(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </Field>
        </div>

        <button type="submit" disabled={submitting} className={buttonClass("primary", "lg", "w-full")}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {submitting ? "Creating…" : "Create match"}
        </button>
      </form>
    </Card>
  );
}
