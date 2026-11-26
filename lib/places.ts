import { destinationOf } from "./destination";
import type { Trip } from "./types";

/** A country or city someone has been to: logged by hand (with an id) or counted from a trip. */
export type Place = {
  id?: string;
  userId?: string;
  kind: "country" | "city";
  country: string; // ISO 3166 alpha-2
  name: string;
  lat?: number;
  lng?: number;
  fromTrip?: string; // the trip's name, when it was counted from one
};

export type Been = { countries: Set<string>; cities: Place[] };

const titleCase = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What a person's ended trips add: each trip's country and every city it stayed in, with a dot
 * where a stop that day has a place. A trip counts only for the people on it.
 */
export function tripPlaces(trips: Trip[], today: string, personName?: string): Place[] {
  const out: Place[] = [];
  for (const t of trips) {
    const ended = t.stage === "memory" || (!!t.endDate && t.endDate < today);
    const onIt = !personName || t.people.some((p) => sameName(p, personName));
    const country = destinationOf(t).country;
    if (!ended || !onIt || !country) continue;
    out.push({ kind: "country", country, name: country, fromTrip: t.name });
    const seen = new Set<string>();
    for (const d of t.days) {
      if (!d.city || seen.has(d.city)) continue;
      seen.add(d.city);
      const at = d.stops.find((s) => s.lat != null && s.lng != null && !s.offMap);
      out.push({ kind: "city", country, name: titleCase(d.city), lat: at?.lat, lng: at?.lng, fromTrip: t.name });
    }
  }
  return out;
}

/** Everywhere one person has been: what they logged plus their ended trips, each place once. */
export function beenBy(userId: string | undefined, logged: Place[], fromTrips: Place[]): Been {
  const mine = logged.filter((p) => p.userId === userId);
  const cities: Place[] = [];
  for (const p of [...mine, ...fromTrips]) {
    if (p.kind === "city" && !cities.some((c) => c.country === p.country && sameName(c.name, p.name))) cities.push(p);
  }
  // A city's country counts even when the country wasn't logged on its own.
  const countries = new Set([...mine, ...fromTrips].map((p) => p.country));
  return { countries, cities };
}

/** For the globe: each country shaded by how many of the people shown have been there. */
export function beenShading(people: Been[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of people) for (const c of b.countries) out[c] = (out[c] ?? 0) + 1;
  return out;
}
