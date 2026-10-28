"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, SearchX, ServerCrash } from "lucide-react";
import { useCommentary } from "@/hooks/use-commentary";
import { useMatches } from "@/hooks/use-matches";
import { useNow } from "@/hooks/use-now";
import { deriveStatus } from "@/lib/match";
import { EmptyState, buttonClass } from "../ui";
import { CommentaryFeed } from "./commentary-feed";
import { MatchSidebar } from "./match-sidebar";
import { Scoreboard, ScoreboardSkeleton } from "./scoreboard";

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
    >
      <ChevronLeft className="size-4" />
      All matches
    </Link>
  );
}

export function MatchCenter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const matchId = Number(id);
  // Keyed so navigating between matches resets all per-match state.
  return <MatchCenterView key={matchId} matchId={Number.isInteger(matchId) && matchId > 0 ? matchId : null} />;
}

function MatchCenterView({ matchId }: { matchId: number | null }) {
  // The API has no single-match endpoint, so look the match up in the recent list.
  const { matches, state, error, retry } = useMatches();
  const commentary = useCommentary(matchId);
  const now = useNow();
  const match = useMemo(() => matches.find((m) => m.id === matchId) ?? null, [matches, matchId]);

  if (state === "loading") return <MatchCenterSkeleton />;

  if (state === "error") {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={ServerCrash}
          title="Couldn't load this match"
          description={error ?? "Something went wrong."}
          action={
            <button onClick={retry} className={buttonClass("secondary")}>
              <RefreshCw className="size-4" />
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={SearchX}
          title="Match not found"
          description="This match doesn't exist or is no longer in the recent fixtures list."
          action={
            <Link href="/" className={buttonClass("secondary")}>
              Browse matches
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <Scoreboard match={match} commentary={commentary.items} now={now} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CommentaryFeed match={match} now={now} isLive={deriveStatus(match, now) === "live"} {...commentary} />
        <MatchSidebar match={match} commentary={commentary.items} now={now} />
      </div>
    </div>
  );
}

export function MatchCenterSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="skeleton h-5 w-28" />
      <ScoreboardSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  );
}
