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

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; countrycode?: string; country?: string; state?: string; osm_value?: string };
};

/**
 * Cities matching what's typed, from Photon (komoot's OpenStreetMap search: free, no key, open to
 * browsers). Only the typed text is sent.
 */
export async function searchCities(q: string, signal?: AbortSignal): Promise<(Place & { region?: string })[]> {
  const t = q.trim();
  if (t.length < 2) return [];
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&limit=8&layer=city&lang=en`, { signal });
  if (!res.ok) return [];
  const { features } = (await res.json()) as { features: PhotonFeature[] };
  const out: (Place & { region?: string })[] = [];
  for (const f of features) {
    const { name, countrycode, state, country } = f.properties;
    if (!name || !countrycode || out.some((p) => p.name === name && p.country === countrycode.toUpperCase())) continue;
    const [lng, lat] = f.geometry.coordinates;
    out.push({ kind: "city", name, country: countrycode.toUpperCase(), lat, lng, region: [state, country].filter(Boolean).join(", ") });
  }
  return out.slice(0, 5);
}
