"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorMessage, listCommentary } from "@/lib/api";
import { compareCommentary } from "@/lib/match";
import type { Commentary } from "@/lib/types";
import { useMatchChannel, useRealtimeEvent } from "@/components/realtime-provider";

type LoadState = "loading" | "ready" | "error";

export function useCommentary(matchId: number | null) {
  const [items, setItems] = useState<Commentary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<ReadonlySet<number>>(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useMatchChannel(matchId);

  useEffect(() => {
    if (matchId == null) return;
    let cancelled = false;
    listCommentary(matchId)
      .then((data) => {
        if (cancelled) return;
        // Merge rather than replace so events that arrived over the socket mid-fetch survive.
        setItems((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of data) byId.set(c.id, c);
          return [...byId.values()];
        });
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
  }, [matchId, reloadKey]);

  useRealtimeEvent((message) => {
    if (message.type !== "commentary" || message.data.matchId !== matchId) return;
    const entry = message.data;
    setItems((prev) => (prev.some((c) => c.id === entry.id) ? prev : [entry, ...prev]));
    setFreshIds((prev) => new Set(prev).add(entry.id));
  });

  const retry = useCallback(() => {
    setState("loading");
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const sorted = useMemo(() => [...items].sort(compareCommentary), [items]);

  return { items: sorted, state, error, freshIds, retry };
}
