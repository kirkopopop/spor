import type { Place } from "./places";

// Codes the browser can name but that aren't countries today (old states, groupings, reserved, and
// old codes for countries it also names by today's: Benin, Burkina Faso, Vanuatu, Zimbabwe, the UK, Vietnam).
const NOT_COUNTRIES = new Set(["DY", "HV", "NH", "RH", "UK", "VD", "XA", "XB", "AN", "BU", "CS", "DD", "FX", "NT", "SU", "TP", "YD", "YU", "ZR", "EU", "EZ", "UN", "QO", "ZZ", "AC", "CP", "CQ", "DG", "EA", "IC", "TA"]);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : undefined;

let list: { code: string; name: string }[] | undefined;

/** Every country by its English name, from the browser itself: no data file, works offline. */
export function countries() {
  if (!list) {
    list = [];
    for (const a of LETTERS)
      for (const b of LETTERS) {
        const code = a + b;
        const name = names?.of(code);
        if (name && name !== code && !NOT_COUNTRIES.has(code)) list.push({ code, name });
      }
    list.sort((x, y) => x.name.localeCompare(y.name));
  }
  return list;
}

export const countryName = (code: string) => names?.of(code) ?? code;

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Countries whose name starts with the query first, then those that contain it. */
export function searchCountries(q: string, limit = 4) {
  const t = fold(q.trim());
  if (!t) return [];
  const all = countries();
  return [...all.filter((c) => fold(c.name).startsWith(t)), ...all.filter((c) => !fold(c.name).startsWith(t) && fold(c.name).includes(t))].slice(0, limit);
}

export type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; countrycode?: string; country?: string; state?: string; type?: string; osm_key?: string; osm_value?: string };
};

export type CityResult = Place & { region?: string };

// Suffixes that name an administrative area rather than the place people call it by.
const SUFFIX = /\s+(?:(?:Metropolitan|Urban|Rural)\s+)?(?:Municipality|Metropolitan Area|Metropolitan Region|Kommune|kommun|Commune)$/i;
const PREFIX = /^(?:(?:City|Municipality|Commune) of)\s+/i;

/** "Hvidovre Municipality" → "Hvidovre", "Istanbul Metropolitan Municipality" → "Istanbul". */
export const cleanPlaceName = (name: string) => name.replace(SUFFIX, "").replace(PREFIX, "").trim() || name.trim();

/**
 * How much a Photon result looks like a city people travel to (lower is better), or undefined
 * for things that aren't settlements (streets, shops, stations, regions, census areas).
 */
export function cityRank(p: PhotonFeature["properties"]): number | undefined {
  const v = p.osm_value ?? "";
  if (p.osm_key === "place") {
    if (v === "city") return 0;
    if (v === "town") return 1;
    // Tokyo is a prefecture-level city: a province tagged with the city layer.
    if ((v === "province" || v === "state") && p.type === "city") return 0;
    if (v === "municipality" || v === "borough" || v === "suburb") return 3;
    if (v === "village") return 4;
    if (v === "hamlet") return 5;
    return undefined;
  }
  // An administrative boundary on the city layer (a municipality): a city, but not one named for people.
  if (p.osm_key === "boundary" && v === "administrative" && p.type === "city") return 3;
  return undefined;
}

/**
 * Real cities from Photon's answer: settlements only, names that start with what was typed first,
 * then cities and towns before villages; one per name and country.
 */
export function pickCities(features: PhotonFeature[], query = "", limit = 5): CityResult[] {
  const typed = fold(query.trim());
  const miss = (name: string) => (typed && !fold(cleanPlaceName(name)).startsWith(typed) ? 1 : 0);
  const ranked = features
    .map((f, i) => ({ f, i, rank: cityRank(f.properties), miss: miss(f.properties.name ?? "") }))
    .filter((r): r is typeof r & { rank: number } => r.rank !== undefined && !!r.f.properties.name && !!r.f.properties.countrycode)
    .sort((a, b) => a.miss - b.miss || a.rank - b.rank || a.i - b.i); // ties keep Photon's order, which puts bigger places first
  const out: CityResult[] = [];
  for (const { f } of ranked) {
    const { state, country } = f.properties;
    const name = cleanPlaceName(f.properties.name!);
    const code = f.properties.countrycode!.toUpperCase();
    if (out.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.country === code)) continue;
    const [lng, lat] = f.geometry.coordinates;
    out.push({ kind: "city", name, country: code, lat, lng, region: [state !== name ? state : undefined, country].filter(Boolean).join(", ") });
  }
  return out.slice(0, limit);
}

/**
 * Cities matching what's typed, from Photon (komoot's OpenStreetMap search: free, no key, open to
 * browsers). Only the typed text is sent. Asks for the place layers only (a big city can be tagged
 * as a district or a province), then keeps real settlements, cities and towns first.
 */
export async function searchCities(q: string, signal?: AbortSignal): Promise<CityResult[]> {
  const t = q.trim();
  if (t.length < 2) return [];
  const layers = ["city", "district", "county", "state"].map((l) => `&layer=${l}`).join("");
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&limit=15&lang=en${layers}`, { signal });
  if (!res.ok) return [];
  const { features } = (await res.json()) as { features: PhotonFeature[] };
  return pickCities(features, t);
}

export type PlaceResult = { name: string; detail: string; lat: number; lng: number };
type PlaceProps = PhotonFeature["properties"] & { street?: string; housenumber?: string; city?: string; district?: string };

/** Photon results as places to put a stop: the name, then where it is (street, area, city). */
export function pickPlaces(features: PhotonFeature[], limit = 6): PlaceResult[] {
  const out: PlaceResult[] = [];
  for (const f of features) {
    const p = f.properties as PlaceProps;
    const name = p.name ?? (p.street ? [p.street, p.housenumber].filter(Boolean).join(" ") : undefined);
    if (!name) continue;
    const street = p.name && p.street ? [p.street, p.housenumber].filter(Boolean).join(" ") : undefined;
    const detail = [...new Set([street, p.district, p.city ?? p.state, p.country].filter((x): x is string => !!x && x !== name))].join(", ");
    const [lng, lat] = f.geometry.coordinates;
    if (out.some((o) => o.name === name && o.detail === detail)) continue;
    out.push({ name, detail, lat, lng });
  }
  return out.slice(0, limit);
}

/**
 * Places for a stop (a museum, a café, an address), nearest to `near` first: the trip's
 * destination, so "Hagia Sophia" finds the one in Istanbul. Only the typed text and that point are sent.
 */
export async function searchPlaces(q: string, near?: [number, number], signal?: AbortSignal): Promise<PlaceResult[]> {
  const t = q.trim();
  if (t.length < 2) return [];
  const bias = near ? `&lat=${near[0].toFixed(3)}&lon=${near[1].toFixed(3)}` : "";
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&limit=8&lang=en${bias}`, { signal });
  if (!res.ok) return [];
  const { features } = (await res.json()) as { features: PhotonFeature[] };
  return pickPlaces(features);
}
