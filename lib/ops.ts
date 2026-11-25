import type { Stop, Trip } from "./types";

/**
 * A hand edit made on a phone. Edits are queued and applied on top of the
 * last trip snapshot, so the screen updates at once and works offline; the
 * queue is pushed to the server when there is signal.
 */
export type StopPatch = Partial<Pick<Stop, "time" | "pickedOptionId" | "doneAt">>;

export type Op = {
  id: string;
  tripId: string;
  at: number; // ms since epoch, for ordering
  stopId: string;
  patch: StopPatch;
};

export function applyOps(trip: Trip, ops: Op[]): Trip {
  const mine = ops.filter((o) => o.tripId === trip.id).sort((a, b) => a.at - b.at);
  if (mine.length === 0) return trip;

  const patches = new Map<string, StopPatch>();
  for (const o of mine) patches.set(o.stopId, { ...patches.get(o.stopId), ...o.patch });

  return {
    ...trip,
    days: trip.days.map((d) => {
      if (!d.stops.some((s) => patches.has(s.id))) return d;
      const stops = d.stops.map((s) => (patches.has(s.id) ? { ...s, ...patches.get(s.id) } : s));
      // Stable sort: equal times keep the plan's order.
      const order = stops.map((s, i) => [s, i] as const);
      order.sort(([a, i], [b, j]) => dayMinute(a.time) - dayMinute(b.time) || i - j);
      return { ...d, stops: order.map(([s]) => s) };
    }),
  };
}

/** Minutes into the travel day; 00:00–04:59 belongs to the night before. */
export const dayMinute = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h < 5 ? h + 24 : h) * 60 + m;
};
