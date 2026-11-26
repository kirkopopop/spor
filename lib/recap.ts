import type { MapPin, MapRoute } from "@/components/map/TripMap";
import { plannedTotal } from "./format";
import type { Day, Note, Stop, Trip } from "./types";
import type { Leg } from "./walkLegs";

const isPlace = (s: Stop) => !s.journey;
const onMap = (s: Stop) => s.lat != null && s.lng != null && !s.offMap;

/** A day someone ticked on: its unticked places were missed. A day with no ticks wasn't recorded. */
export const recorded = (day: Day) => day.stops.some((s) => isPlace(s) && s.doneAt);
/** Reached: ticked on a recorded day, or planned on a day nobody recorded. */
const reachedOn = (day: Day) => (s: Stop) => isPlace(s) && (!recorded(day) || !!s.doneAt);

/**
 * After the trip: what actually happened, read from the ticks made along the way. Days nobody
 * ticked on are told from their plan, so a trip lived without the app isn't all "missed".
 */
export function recap(trip: Trip, legs: Map<string, Leg>) {
  const places = trip.days.flatMap((d) => d.stops.filter(isPlace));
  const visited = trip.days.flatMap((d) => d.stops.filter(reachedOn(d)));
  const recordedDays = trip.days.filter(recorded).length;
  const meters = visited.reduce((n, s) => n + (legs.get(s.id)?.meters ?? 0), 0);
  return {
    recordedDays,
    fromPlan: trip.days.length - recordedDays, // days told from the plan
    visited: visited.length,
    planned: places.length,
    walkedKm: Math.round(meters / 100) / 10,
    cities: new Set(trip.days.map((d) => d.city).filter(Boolean)).size,
    spent: (trip.expenses ?? []).reduce((n, e) => n + e.amount, 0),
    plannedSpend: plannedTotal(trip),
    missed: trip.days
      .filter(recorded)
      .map((day) => ({ day, stops: day.stops.filter((s) => isPlace(s) && !s.doneAt) }))
      .filter((m) => m.stops.length),
    journal: [...(trip.notes ?? [])].sort((a: Note, b: Note) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/** The trip as it happened: each day's line through the places reached, one pin per day. */
export function recapMap(trip: Trip, legs: Map<string, Leg>) {
  const pins: MapPin[] = [];
  const routes: MapRoute[] = [];
  trip.days.forEach((day, i) => {
    const reached = day.stops.filter((s) => onMap(s) && reachedOn(day)(s));
    if (!reached.length) return;
    pins.push({ id: day.id, lat: reached[0].lat!, lng: reached[0].lng!, label: String(i + 1), tone: "done" });
    reached.slice(1).forEach((s, j) => {
      const prev = reached[j];
      // A routed walk only fits when it starts at the previous place reached.
      const leg = legs.get(s.id);
      const fits = leg && Math.abs(leg.points[0][0] - prev.lat!) < 1e-4 && Math.abs(leg.points[0][1] - prev.lng!) < 1e-4;
      routes.push({
        id: `${day.id}-${s.id}`,
        points: fits ? leg.points : [[prev.lat!, prev.lng!], [s.lat!, s.lng!]],
        style: fits ? "path" : "dashed",
      });
    });
  });
  return { pins, routes };
}
