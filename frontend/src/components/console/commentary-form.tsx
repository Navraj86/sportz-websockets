"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, Megaphone, Send } from "lucide-react";
import { ApiError, createCommentary, errorMessage } from "@/lib/api";
import { PRESET_EVENT_TYPES, eventStyle } from "@/lib/events";
import { deriveStatus, elapsedMinute } from "@/lib/match";
import type { Match } from "@/lib/types";
import { Card, CardHeader, EmptyState, buttonClass } from "../ui";
import { Chip, Field, inputClass } from "./fields";

const PERIODS = ["1st half", "2nd half", "Extra time", "Penalties", "Q1", "Q2", "Q3", "Q4", "Innings 1", "Innings 2"];
const MAX_MESSAGE = 500;

type Side = "home" | "away" | "none";

const EMPTY = { minute: "", period: "", eventType: "update", side: "none" as Side, actor: "", message: "", tags: "" };

export function CommentaryForm({
  matches,
  matchId,
  onMatchChange,
  now,
}: {
  matches: Match[];
  matchId: number | null;
  onMatchChange: (id: number) => void;
  now: number;
}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const match = matches.find((m) => m.id === matchId) ?? null;
  const status = match ? deriveStatus(match, now) : null;
  const currentMinute = match && status === "live" ? elapsedMinute(match, now) : null;

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function onSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!match) return;

    const next: Record<string, string> = {};
    const minuteText = form.minute || (currentMinute != null ? String(currentMinute) : "");
    const minute = Number(minuteText);
    if (minuteText === "" || !Number.isInteger(minute) || minute < 0) next.minute = "Enter a whole minute (0 or more).";
    if (!form.message.trim()) next.message = "Write the commentary message.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const team = form.side === "home" ? match.homeTeam : form.side === "away" ? match.awayTeam : undefined;
    const tags = form.tags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    setSubmitting(true);
    try {
      await createCommentary(match.id, {
        minute,
        period: form.period.trim() || undefined,
        eventType: form.eventType,
        team,
        actor: form.actor.trim() || undefined,
        message: form.message.trim(),
        tags: tags.length ? tags : undefined,
      });
      toast.success(`${eventStyle(form.eventType).label} published`, {
        description: `${minute}′ · ${match.homeTeam} vs ${match.awayTeam}`,
      });
      // Keep the match context (minute, period) so the next update is quick to post.
      setForm((f) => ({ ...EMPTY, minute: f.minute, period: f.period }));
      setErrors({});
    } catch (error) {
      if (error instanceof ApiError && error.issues.length) setErrors(error.fieldErrors());
      toast.error("Couldn't publish update", { description: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const sorted = [...matches].sort((a, b) => {
    const rank = { live: 0, scheduled: 1, finished: 2 } as const;
    return rank[deriveStatus(a, now)] - rank[deriveStatus(b, now)] || b.id - a.id;
  });

  return (
    <Card>
      <CardHeader
        title="Publish commentary"
        description="Updates stream instantly to everyone watching the match."
        icon={Megaphone}
        action={
          match && (
            <Link
              href={`/matches/${match.id}`}
              className="flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-fg"
            >
              View match
              <ArrowUpRight className="size-3.5" />
            </Link>
          )
        }
      />

      {matches.length === 0 ? (
        <EmptyState
          className="m-5"
          icon={Megaphone}
          title="No matches to cover"
          description="Create a match first, then publish live updates for it here."
        />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
          <Field label="Match" htmlFor="match">
            <select
              id="match"
              value={matchId ?? ""}
              onChange={(e) => onMatchChange(Number(e.target.value))}
              className={inputClass}
            >
              {matchId == null && <option value="">Select a match…</option>}
              {sorted.map((m) => {
                const s = deriveStatus(m, now);
                const prefix = s === "live" ? "● LIVE" : s === "scheduled" ? "Upcoming" : "FT";
                return (
                  <option key={m.id} value={m.id}>
                    {prefix} — {m.homeTeam} vs {m.awayTeam} ({m.sport})
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Event" error={errors.eventType}>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_EVENT_TYPES.map((type) => {
                const style = eventStyle(type);
                const Icon = style.icon;
                return (
                  <Chip key={type} active={form.eventType === type} color={style.color} onClick={() => set("eventType", type)}>
                    <Icon className="size-3.5" style={{ color: style.color }} />
                    {style.label}
                  </Chip>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <Field
              label="Minute"
              htmlFor="minute"
              error={errors.minute}
              hint={
                currentMinute != null && form.minute !== String(currentMinute) ? (
                  <button
                    type="button"
                    onClick={() => set("minute", String(currentMinute))}
                    className="text-brand hover:underline"
                  >
                    Now {currentMinute}′
                  </button>
                ) : undefined
              }
            >
              <input
                id="minute"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.minute}
                onChange={(e) => set("minute", e.target.value)}
                placeholder={currentMinute != null ? String(currentMinute) : "0"}
                aria-invalid={!!errors.minute}
                className={inputClass}
              />
            </Field>
            <Field label="Period" htmlFor="period" optional>
              <input
                id="period"
                list="periods"
                value={form.period}
                onChange={(e) => set("period", e.target.value)}
                placeholder="e.g. 2nd half"
                className={inputClass}
              />
              <datalist id="periods">
                {PERIODS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Team" optional>
              <div role="radiogroup" className="grid grid-cols-3 rounded-lg border border-line bg-bg/60 p-0.5">
                {(
                  [
                    ["home", match?.homeTeam ?? "Home"],
                    ["away", match?.awayTeam ?? "Away"],
                    ["none", "Neutral"],
                  ] as const
                ).map(([side, label]) => (
                  <button
                    key={side}
                    type="button"
                    role="radio"
                    aria-checked={form.side === side}
                    onClick={() => set("side", side)}
                    className={`truncate rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      form.side === side ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Player / actor" htmlFor="actor" optional error={errors.actor}>
              <input
                id="actor"
                value={form.actor}
                onChange={(e) => set("actor", e.target.value)}
                placeholder="e.g. B. Saka"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Message"
            htmlFor="message"
            error={errors.message}
            hint={`${form.message.length}/${MAX_MESSAGE}`}
          >
            <textarea
              id="message"
              rows={3}
              maxLength={MAX_MESSAGE}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
              }}
              placeholder="What just happened?"
              aria-invalid={!!errors.message}
              className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed`}
            />
          </Field>

          <Field label="Tags" htmlFor="tags" optional hint="Comma separated">
            <input
              id="tags"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="e.g. counter-attack, header"
              className={inputClass}
            />
          </Field>

          <div className="flex items-center justify-between gap-4">
            <span className="hidden text-[11px] text-fg-subtle sm:inline">
              <kbd className="rounded border border-line px-1 font-mono">Ctrl</kbd> +{" "}
              <kbd className="rounded border border-line px-1 font-mono">Enter</kbd> to publish
            </span>
            <button type="submit" disabled={submitting || !match} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {submitting ? "Publishing…" : "Publish update"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
