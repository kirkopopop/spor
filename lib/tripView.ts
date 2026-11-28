import type { MapPin, MapRoute } from "@/components/map/TripMap";
import type { Day, Stage, Trip } from "./types";
import { money, openPicks, plannedTotal, toBookCount } from "./format";
import type { Leg } from "./walkLegs";

const mapped = (s: { lat?: number; lng?: number; offMap?: boolean }) => s.lat != null && s.lng != null && !s.offMap;

/**
 * A day's stops as numbered pins. Numbers follow the list (1 = first stop), so a row and
 * its pin share a number even when some stops (trains, flights) have no place on the map.
 */
export function dayPins(day: Day, nextId?: string) {
  const numbers = new Map(day.stops.map((s, i) => [s.id, i + 1]));
  const pins: MapPin[] = day.stops.filter(mapped).map((s) => ({
    id: s.id,
    lat: s.lat!,
    lng: s.lng!,
    label: String(numbers.get(s.id)),
    tone: s.id === nextId ? "next" : s.doneAt ? "done" : s.kind === "fixed" ? "fixed" : "default",
  }));
  const route: MapRoute = { id: day.id, points: day.stops.filter(mapped).map((s) => [s.lat!, s.lng!]) };
  return { pins, numbers, route };
}

/**
 * A day's lines, one per connection between stops on the map: a routed walk follows its real
 * path, anything else is a quiet dash (stop order, not a path), and the leg into `activeId` is solid.
 */
export function dayRoutes(day: Day | undefined, activeId?: string, legs?: Map<string, Leg>): MapRoute[] {
  if (!day) return [];
  const placed = day.stops.filter(mapped);
  return placed.slice(1).map((s, i) => {
    const prev = placed[i];
    const leg = legs?.get(s.id);
    return {
      id: `${day.id}-${s.id}`,
      points: leg?.points ?? [
        [prev.lat!, prev.lng!],
        [s.lat!, s.lng!],
      ],
      style: s.id === activeId ? "solid" : leg ? "path" : "dashed",
    };
  });
}

/**
 * A trip's stage as everyone sees it: the stage it was set to, moved on by the calendar.
 * An idea without dates stays an idea; one that has ended is a memory; one under way is live.
 */
export function tripStage(t: Pick<Trip, "stage" | "startDate" | "endDate">, today: string): Stage {
  if (t.stage === "idea" || !t.startDate) return "idea";
  if (t.stage === "memory" || t.endDate < today) return "memory";
  if (t.stage === "live" || (t.startDate <= today && t.endDate >= today)) return "live";
  return "planning";
}

/** Where a trip stands relative to today: now, upcoming, an idea, or past. */
export function groupTrips(trips: Trip[], today: string) {
  const g = { now: [] as Trip[], upcoming: [] as Trip[], ideas: [] as Trip[], past: [] as Trip[] };
  const into = { idea: g.ideas, memory: g.past, live: g.now, planning: g.upcoming };
  for (const t of trips) into[tripStage(t, today)].push(t);
  const byStart = (a: Trip, b: Trip) => a.startDate.localeCompare(b.startDate);
  g.now.sort(byStart);
  g.upcoming.sort(byStart);
  g.past.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return g;
}

/** One line per trip through every mapped stop, for the overview map. */
export function tripRoutes(trips: Trip[], today: string): MapRoute[] {
  return trips
    .map((t) => ({
      id: t.id,
      tone: (tripStage(t, today) === "memory" ? "past" : "accent") as MapRoute["tone"],
      points: t.days.flatMap((d) => d.stops.filter(mapped).map((s) => [s.lat!, s.lng!] as [number, number])),
    }))
    .filter((r) => r.points.length > 0);
}

export type CardChip = { text: string; tone?: "fixed" | "ok" };

/**
 * The status chips under the next-trip card. "All booked" only when there are bookings and
 * every one is booked; with nothing else to say, one useful line for where the trip stands.
 */
export function tripCardChips(trip: Trip, stage: Stage, today: string): CardChip[] {
  const toBook = toBookCount(trip);
  const picks = openPicks(trip);
  const planned = plannedTotal(trip);
  const chips: CardChip[] = [];
  if (toBook > 0) chips.push({ text: `${toBook} to book`, tone: "fixed" });
  if (picks > 0) chips.push({ text: `${picks} ${picks === 1 ? "pick" : "picks"} open` });
  if (planned > 0) chips.push({ text: `${money(planned, trip.currency)} planned` });
  if (trip.bookings.length > 0 && toBook === 0) chips.push({ text: "All booked", tone: "ok" });
  if (chips.length) return chips;
  if (stage === "live") {
    const n = trip.days.find((d) => d.date === today)?.stops.length ?? 0;
    return [{ text: n ? `Today: ${n} ${n === 1 ? "stop" : "stops"}` : "Nothing planned today" }];
  }
  const stops = trip.days.reduce((n, d) => n + d.stops.length, 0);
  return [{ text: `${stops} ${stops === 1 ? "stop" : "stops"} planned` }];
}
