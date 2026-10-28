"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, listMatches } from "@/lib/api";
import type { Match } from "@/lib/types";
import { useRealtimeEvent } from "@/components/realtime-provider";

type LoadState = "loading" | "ready" | "error";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<ReadonlySet<number>>(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMatches()
      .then((data) => {
        if (cancelled) return;
        setMatches(data);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useRealtimeEvent((message) => {
    if (message.type !== "match_created") return;
    const match = message.data;
    setMatches((prev) => (prev.some((m) => m.id === match.id) ? prev : [match, ...prev]));
    setFreshIds((prev) => new Set(prev).add(match.id));
  });

  const retry = useCallback(() => {
    setState("loading");
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  /** Add a match created locally (the broadcast will be de-duplicated). */
  const addMatch = useCallback((match: Match) => {
    setMatches((prev) => (prev.some((m) => m.id === match.id) ? prev : [match, ...prev]));
  }, []);

  return { matches, state, error, freshIds, retry, addMatch };
}
