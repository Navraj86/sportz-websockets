"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ServerMessage } from "@/lib/types";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "offline";

type Listener = (message: ServerMessage) => void;

interface RealtimeApi {
  status: ConnectionStatus;
  /** Subscribe to a match channel. Ref-counted; returns an unsubscribe function. */
  subscribe: (matchId: number) => () => void;
  addListener: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeApi | null>(null);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const MAX_BACKOFF_MS = 30_000;
// After this many failed attempts in a row we show "offline" but keep retrying.
const OFFLINE_AFTER_ATTEMPTS = 3;

function send(socket: WebSocket | null, payload: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<Listener>());
  const subscriptionsRef = useRef(new Map<number, number>());

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      clearTimeout(retryTimer);
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
        // Restore channel subscriptions after a reconnect.
        for (const matchId of subscriptionsRef.current.keys()) {
          send(socket, { type: "subscribe", matchId });
        }
      };

      socket.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        for (const listener of listenersRef.current) listener(message);
      };

      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        socketRef.current = null;
        attempt += 1;
        setStatus(attempt >= OFFLINE_AFTER_ATTEMPTS ? "offline" : "reconnecting");
        const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (attempt - 1));
        retryTimer = setTimeout(connect, backoff + Math.random() * 500);
      };
    };

    // Reconnect immediately when the network or tab comes back instead of waiting out the backoff.
    const reconnectNow = () => {
      if (disposed || socketRef.current) return;
      attempt = 0;
      setStatus("connecting");
      connect();
    };
    const onVisibility = () => document.visibilityState === "visible" && reconnectNow();

    connect();
    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", reconnectNow);
      document.removeEventListener("visibilitychange", onVisibility);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket?.readyState === WebSocket.CONNECTING) {
        // Closing a socket mid-handshake logs a browser warning; close once it opens instead.
        socket.onopen = () => socket.close();
      } else {
        socket?.close();
      }
    };
  }, []);

  const subscribe = useCallback((matchId: number) => {
    const subs = subscriptionsRef.current;
    const count = subs.get(matchId) ?? 0;
    subs.set(matchId, count + 1);
    if (count === 0) send(socketRef.current, { type: "subscribe", matchId });

    return () => {
      const current = subs.get(matchId) ?? 0;
      if (current <= 1) {
        subs.delete(matchId);
        send(socketRef.current, { type: "unsubscribe", matchId });
      } else {
        subs.set(matchId, current - 1);
      }
    };
  }, []);

  const addListener = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ status, subscribe, addListener }), [status, subscribe, addListener]);

  return <RealtimeContext value={value}>{children}</RealtimeContext>;
}

export function useRealtime(): RealtimeApi {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used inside <RealtimeProvider>");
  return ctx;
}

/** Calls `handler` for every server message. The latest handler is always used. */
export function useRealtimeEvent(handler: Listener) {
  const { addListener } = useRealtime();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => addListener((message) => handlerRef.current(message)), [addListener]);
}

/** Keeps a match channel subscription open while the calling component is mounted. */
export function useMatchChannel(matchId: number | null) {
  const { subscribe } = useRealtime();
  useEffect(() => {
    if (matchId == null) return;
    return subscribe(matchId);
  }, [matchId, subscribe]);
}
