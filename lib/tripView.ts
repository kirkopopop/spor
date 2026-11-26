import type { MapPin, MapRoute } from "@/components/map/TripMap";
import type { Day, Trip } from "./types";

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

/** The leg into a stop: from the previous stop that has a place on the map. */
export function legInto(day: Day, stopId?: string): [number, number][] {
  if (!stopId) return [];
  const placed = day.stops.filter(mapped);
  const i = placed.findIndex((s) => s.id === stopId);
  if (i <= 0) return [];
  return [placed[i - 1], placed[i]].map((s) => [s.lat!, s.lng!]);
}

/** A day's lines: stop order as quiet dashes (not real paths), the leg into `activeId` solid. */
export function dayRoutes(day: Day | undefined, activeId?: string): MapRoute[] {
  if (!day) return [];
  const leg = legInto(day, activeId);
  return [
    { ...dayPins(day).route, style: "dashed" },
    ...(leg.length ? [{ id: `${day.id}-leg`, points: leg, style: "solid" as const }] : []),
  ];
}

/** Where a trip stands relative to today: now, upcoming, an idea, or past. */
export function groupTrips(trips: Trip[], today: string) {
  const g = { now: [] as Trip[], upcoming: [] as Trip[], ideas: [] as Trip[], past: [] as Trip[] };
  for (const t of trips) {
    if (t.stage === "idea" || !t.startDate) g.ideas.push(t);
    else if (t.stage === "memory" || t.endDate < today) g.past.push(t);
    else if (t.stage === "live" || (t.startDate <= today && t.endDate >= today)) g.now.push(t);
    else g.upcoming.push(t);
  }
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
      tone: (t.stage === "memory" || (t.endDate && t.endDate < today) ? "past" : "accent") as MapRoute["tone"],
      points: t.days.flatMap((d) => d.stops.filter(mapped).map((s) => [s.lat!, s.lng!] as [number, number])),
    }))
    .filter((r) => r.points.length > 0);
}
