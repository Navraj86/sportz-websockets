"use client";

import { useSyncExternalStore } from "react";

// One shared ticking clock for the whole app. The server snapshot is 0 so the current time is
// never read during prerendering; callers treat 0 as "time unknown".
const TICK_MS = 1000;

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const cb of subscribers) cb();
    }, TICK_MS);
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  // Must return a cached value between ticks; React re-reads it after subscribing.
  if (!now) now = Date.now();
  return now;
}

const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
