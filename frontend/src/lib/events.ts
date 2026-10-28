import {
  AlertTriangle,
  ArrowLeftRight,
  CircleDot,
  Clock,
  Crosshair,
  Flag,
  Hand,
  HeartPulse,
  type LucideIcon,
  MessageSquareText,
  MonitorPlay,
  Play,
  RectangleVertical,
  Shield,
  Square,
  Target,
  Trophy,
  Whistle,
} from "lucide-react";

export interface EventStyle {
  label: string;
  icon: LucideIcon;
  /** CSS color used for the icon, chip and timeline markers. */
  color: string;
  /** Key moments are highlighted in the feed and marked on the match timeline. */
  key: boolean;
}

const EVENT_STYLES: Record<string, EventStyle> = {
  goal: { label: "Goal", icon: Trophy, color: "var(--brand)", key: true },
  score: { label: "Score", icon: Trophy, color: "var(--brand)", key: true },
  try: { label: "Try", icon: Trophy, color: "var(--brand)", key: true },
  touchdown: { label: "Touchdown", icon: Trophy, color: "var(--brand)", key: true },
  wicket: { label: "Wicket", icon: Target, color: "var(--live)", key: true },
  boundary: { label: "Boundary", icon: Flag, color: "var(--brand)", key: true },
  six: { label: "Six", icon: Flag, color: "var(--brand)", key: true },
  yellow_card: { label: "Yellow card", icon: RectangleVertical, color: "#facc15", key: true },
  red_card: { label: "Red card", icon: RectangleVertical, color: "var(--live)", key: true },
  card: { label: "Card", icon: RectangleVertical, color: "#facc15", key: true },
  penalty: { label: "Penalty", icon: Crosshair, color: "var(--warning)", key: true },
  var: { label: "VAR review", icon: MonitorPlay, color: "#a78bfa", key: true },
  substitution: { label: "Substitution", icon: ArrowLeftRight, color: "var(--upcoming)", key: false },
  chance: { label: "Chance", icon: Crosshair, color: "#f472b6", key: false },
  shot: { label: "Shot", icon: Crosshair, color: "#f472b6", key: false },
  save: { label: "Save", icon: Hand, color: "#38bdf8", key: false },
  foul: { label: "Foul", icon: AlertTriangle, color: "var(--warning)", key: false },
  corner: { label: "Corner", icon: Flag, color: "#94a3b8", key: false },
  offside: { label: "Offside", icon: Flag, color: "#94a3b8", key: false },
  injury: { label: "Injury", icon: HeartPulse, color: "#fb7185", key: false },
  timeout: { label: "Timeout", icon: Clock, color: "#94a3b8", key: false },
  defence: { label: "Defence", icon: Shield, color: "#38bdf8", key: false },
  kickoff: { label: "Kick-off", icon: Play, color: "var(--success)", key: true },
  halftime: { label: "Half-time", icon: Whistle, color: "#94a3b8", key: true },
  fulltime: { label: "Full-time", icon: Whistle, color: "#94a3b8", key: true },
  period_end: { label: "End of period", icon: Square, color: "#94a3b8", key: false },
  update: { label: "Update", icon: MessageSquareText, color: "var(--fg-muted)", key: false },
};

const ALIASES: Record<string, string> = {
  yellow: "yellow_card",
  yellowcard: "yellow_card",
  red: "red_card",
  redcard: "red_card",
  sub: "substitution",
  kick_off: "kickoff",
  half_time: "halftime",
  ht: "halftime",
  full_time: "fulltime",
  ft: "fulltime",
  basket: "score",
  point: "score",
  points: "score",
  "4": "boundary",
  four: "boundary",
  "6": "six",
  commentary: "update",
};

const FALLBACK: EventStyle = { label: "Update", icon: CircleDot, color: "var(--fg-muted)", key: false };

export function normalizeEventType(type: string | null | undefined): string {
  if (!type) return "update";
  const k = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[k] ?? ALIASES[k.replace(/_/g, "")] ?? k;
}

export function eventStyle(type: string | null | undefined): EventStyle {
  const key = normalizeEventType(type);
  const style = EVENT_STYLES[key];
  if (style) return style;
  if (!type) return FALLBACK;
  // Unknown types still get a readable label.
  const label = type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return { ...FALLBACK, label };
}

/** Event types offered as one-click presets in the operator console. */
export const PRESET_EVENT_TYPES = [
  "goal",
  "chance",
  "save",
  "foul",
  "yellow_card",
  "red_card",
  "substitution",
  "corner",
  "var",
  "injury",
  "kickoff",
  "halftime",
  "fulltime",
  "update",
] as const;
