"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeEvent } from "./realtime-provider";

/** App-wide toast whenever a new fixture is broadcast. */
export function MatchNotifier() {
  const router = useRouter();

  useRealtimeEvent((message) => {
    if (message.type !== "match_created") return;
    const { id, homeTeam, awayTeam, sport } = message.data;
    toast(`${homeTeam} vs ${awayTeam}`, {
      id: `match-${id}`,
      description: `New ${sport} fixture added`,
      action: { label: "View", onClick: () => router.push(`/matches/${id}`) },
    });
  });

  return null;
}
