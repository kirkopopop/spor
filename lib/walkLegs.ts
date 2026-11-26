import type { Day, Stop } from "./types";

/** A routed walk: the path along the streets, and how long it really takes. */
export type Leg = { points: [number, number][]; min: number; meters: number };
export type LatLng = [number, number];
export type WalkRequest = { stopId: string; key: string; from: LatLng; to: LatLng };

const onMap = (s?: Stop): s is Stop & { lat: number; lng: number } => !!s && s.lat != null && s.lng != null && !s.offMap;

/** Five decimals is about a metre: the same walk always gets the same key. */
export const legKey = (from: LatLng, to: LatLng) => [...from, ...to].map((n) => n.toFixed(5)).join(",");

/**
 * The walks worth routing: a stop reached on foot from the stop right before it, both with a
 * place on the map. A walk after a train or flight has no known start, so it stays an estimate.
 */
export function walkRequests(day: Day): WalkRequest[] {
  return day.stops.flatMap((s, i) => {
    const prev = day.stops[i - 1];
    if (s.go?.mode !== "walk" || !onMap(s) || !onMap(prev)) return [];
    const from: LatLng = [prev.lat, prev.lng];
    const to: LatLng = [s.lat, s.lng];
    return [{ stopId: s.id, key: legKey(from, to), from, to }];
  });
}

/** The day with routed walking times in place of estimates; untouched when nothing was routed. */
export function applyLegs(day: Day, legs: Map<string, Leg>): Day {
  if (!day.stops.some((s) => legs.has(s.id))) return day;
  return {
    ...day,
    stops: day.stops.map((s) => {
      const leg = legs.get(s.id);
      return leg && s.go ? { ...s, go: { ...s.go, min: leg.min, est: false } } : s;
    }),
  };
}

type OsrmResponse = { code: string; routes?: { duration: number; distance: number; geometry: { coordinates: [number, number][] } }[] };

/** One route from the OSRM foot service (lng,lat pairs, seconds, metres). */
export function legFromOsrm(res: OsrmResponse): Leg | undefined {
  const r = res.code === "Ok" ? res.routes?.[0] : undefined;
  if (!r || r.geometry.coordinates.length < 2) return undefined;
  return {
    points: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    min: Math.max(1, Math.round(r.duration / 60)),
    meters: Math.round(r.distance),
  };
}

/** FOSSGIS's public OSRM with the foot profile: free, no key, open to browsers (light use). */
export const walkUrl = (from: LatLng, to: LatLng) =>
  `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
