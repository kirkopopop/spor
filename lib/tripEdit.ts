import { dayMonth } from "./format";
import type { Day, Stage, Trip } from "./types";

export const STAGES: Stage[] = ["idea", "planning", "live", "memory"];
export const STAGE_LABEL: Record<Stage, string> = { idea: "Idea", planning: "Planning", live: "Live", memory: "Memory" };

/** Every date from start to end, inclusive (YYYY-MM-DD). */
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start || !end || end < start) return out;
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export type DatesPlan = {
  add: string[]; // dates that get a new, empty day
  drop: Day[]; // days outside the new range
  lost: Day[]; // the dropped days that still have stops: ask before removing them
};

/** What new dates do to a trip's days. No dates (an idea) keeps no days. */
export function planDates(trip: Pick<Trip, "days">, start: string, end: string): DatesPlan {
  const keep = new Set(datesBetween(start, end));
  const have = new Set(trip.days.map((d) => d.date));
  const drop = trip.days.filter((d) => !keep.has(d.date));
  return {
    add: [...keep].filter((d) => !have.has(d)),
    drop,
    lost: drop.filter((d) => d.stops.length > 0),
  };
}

/** "Sat 28 Nov has 2 stops", "Sat 28 Nov and Sun 29 Nov have 5 stops" */
export function lostSummary(lost: Day[]): string {
  const stops = lost.reduce((n, d) => n + d.stops.length, 0);
  const names = lost.map((d) => dayMonth(d.date));
  const list = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${list} ${lost.length === 1 ? "has" : "have"} ${stops} ${stops === 1 ? "stop" : "stops"}`;
}

export type TripPatch = Partial<Pick<Trip, "name" | "stage" | "startDate" | "endDate" | "currency">>;

/** An idea that gets dates becomes a plan; anything else keeps its stage. */
export function stageAfterDates(stage: Stage, start: string): Stage {
  return stage === "idea" && start ? "planning" : stage;
}

/** The trips row for a patch. Empty dates clear them (an idea). */
export function patchToRow(p: TripPatch) {
  const row: Record<string, string | null> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.stage !== undefined) row.stage = p.stage;
  if (p.currency !== undefined) row.currency = p.currency;
  if (p.startDate !== undefined) row.start_date = p.startDate || null;
  if (p.endDate !== undefined) row.end_date = p.endDate || null;
  return row;
}
