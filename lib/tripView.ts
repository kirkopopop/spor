import type { MapPin, MapRoute } from "@/components/map/TripMap";
import type { Day, Trip } from "./types";
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
