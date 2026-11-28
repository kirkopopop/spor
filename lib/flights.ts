import { destinationOf } from "./destination";
import type { Place } from "./places";
import type { Trip } from "./types";

/** One flight one person took. Distance and countries are worked out from the airports when it's logged. */
export type Flight = {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  from: string; // IATA, e.g. "CPH"
  to: string;
  fromCountry: string; // ISO 3166 alpha-2
  toCountry: string;
  km: number;
  minutes?: number; // air time as flown; missing means estimated from the distance
};

/** [iata, name, city, country, lat, lng], from assets/geo/airports.json */
export type Airport = [string, string, string, string, number, number];

export const EARTH_KM = 40_075; // once around the equator

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in whole kilometres. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const [lat1, lng1] = a.map(rad);
  const [lat2, lng2] = b.map(rad);
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** Air time when nobody said: half an hour for taxi, climb and landing, then 800 km/h, to 5 minutes. */
export const estimatedMinutes = (km: number) => Math.round((30 + (km / 800) * 60) / 5) * 5;

export const flightMinutes = (f: Flight) => f.minutes ?? estimatedMinutes(f.km);

/** "1h 55m", "45m", "312h" */
export function duration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (h >= 100 || m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "1:55" typed into the air time field, or "115"; undefined when it isn't a time. */
export function parseAirTime(s: string): number | undefined {
  const t = s.trim();
  const hm = /^(\d{1,2})[:.h ]\s*(\d{1,2})m?$/.exec(t);
  if (hm && Number(hm[2]) < 60) return Number(hm[1]) * 60 + Number(hm[2]);
  if (/^\d{1,4}$/.test(t) && Number(t) > 0) return Number(t);
  return undefined;
}

export const airTimeText = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

/** The flight a person flies on to within a day of landing makes this one a connection, not a visit. */
export function connections(flights: Flight[]): Set<string> {
  const out = new Set<string>();
  const byPerson = new Map<string, Flight[]>();
  for (const f of flights) byPerson.set(f.userId ?? "", [...(byPerson.get(f.userId ?? "") ?? []), f]);
  for (const list of byPerson.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((f, i) => {
      const next = sorted.slice(i + 1).find((n) => n.from === f.to);
      if (next && daysBetween(f.date, next.date) <= 1) out.add(f.id);
    });
  }
  return out;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Countries a person flew to (not through), for Places been. */
export function flightPlaces(flights: Flight[]): Place[] {
  const through = connections(flights);
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of flights) {
    if (through.has(f.id) || seen.has(f.toCountry)) continue;
    seen.add(f.toCountry);
    out.push({ kind: "country", country: f.toCountry, name: f.toCountry, fromFlight: true });
  }
  return out;
}

/** Home is where most of a person's flights leave from; it isn't a country "visited" in a year. */
export function homeCountry(flights: Flight[]): string | undefined {
  const n = new Map<string, number>();
  for (const f of flights) n.set(f.fromCountry, (n.get(f.fromCountry) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export type Stats = {
  countries: number;
  flights: number;
  minutes: number;
  km: number;
  estimated: boolean; // some air time is an estimate
  longest?: Flight;
};

const ended = (t: Trip, today: string) => t.stage === "memory" || (!!t.endDate && t.endDate < today);
const onTrip = (t: Trip, name?: string) => !name || t.people.some((p) => p.trim().toLowerCase() === name.trim().toLowerCase());

/**
 * One person's travel, overall or in one year. Overall countries are everything they've been (the
 * same set the globe shades); a year counts the countries of trips that ended that year and the
 * countries flown to that year, without home.
 */
export function travelStats(opts: {
  flights: Flight[]; // this person's
  trips: Trip[];
  today: string;
  personName?: string;
  beenCountries: Set<string>;
  year?: string;
}): Stats {
  const { trips, today, personName, beenCountries, year } = opts;
  const flights = year ? opts.flights.filter((f) => f.date.startsWith(year)) : opts.flights;
  let countries = beenCountries.size;
  if (year) {
    const home = homeCountry(opts.flights);
    const through = connections(opts.flights);
    const set = new Set<string>();
    for (const t of trips) {
      const c = destinationOf(t).country;
      if (c && t.startDate.startsWith(year) && ended(t, today) && onTrip(t, personName)) set.add(c);
    }
    for (const f of flights) if (!through.has(f.id)) set.add(f.toCountry);
    if (home) set.delete(home);
    countries = set.size;
  }
  return {
    countries,
    flights: flights.length,
    minutes: flights.reduce((n, f) => n + flightMinutes(f), 0),
    km: flights.reduce((n, f) => n + f.km, 0),
    estimated: flights.some((f) => f.minutes == null),
    longest: flights.reduce<Flight | undefined>((a, f) => (!a || f.km > a.km ? f : a), undefined),
  };
}

/** Years with something to show, newest first: flights and ended trips. */
export function travelYears(flights: Flight[], trips: Trip[], today: string, personName?: string): string[] {
  const ys = new Set(flights.map((f) => f.date.slice(0, 4)));
  for (const t of trips) if (t.startDate && ended(t, today) && onTrip(t, personName)) ys.add(t.startDate.slice(0, 4));
  return [...ys].sort().reverse();
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Airports for what's typed: the code itself first, then cities, then names. */
export function searchAirports(all: Airport[], q: string, limit = 6): Airport[] {
  const t = fold(q.trim());
  if (!t) return [];
  const code = t.length === 3 ? all.filter((a) => a[0].toLowerCase() === t) : [];
  const city = all.filter((a) => !code.includes(a) && fold(a[2]).startsWith(t));
  const name = all.filter((a) => !code.includes(a) && !city.includes(a) && fold(a[1]).includes(t));
  return [...code, ...city, ...name].slice(0, limit);
}

/** A flight between two airports, ready to save. */
export function flightBetween(from: Airport, to: Airport) {
  return { from: from[0], to: to[0], fromCountry: from[3], toCountry: to[3], km: distanceKm([from[4], from[5]], [to[4], to[5]]) };
}
