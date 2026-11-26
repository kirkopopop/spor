import type { Trip } from "./types";

export type Landmark =
  | "london" | "scotland" | "munich" | "berlin" | "paris" | "rome" | "amsterdam" | "copenhagen"
  | "barcelona" | "newyork" | "tokyo" | "mountains" | "coast" | "trip";
export type Photo = "london" | "munich" | "edinburgh";

export type Destination = {
  key: Landmark;
  label: string;
  hue: string; // the tile's tint; mixed with the theme's card and ink, so it works light and dark
  photo?: Photo;
  at?: [number, number]; // the place's centre, for the globe; regions like "mountains" have none
  country?: string; // ISO 3166 alpha-2, for places been; regions have none
};

type Place = Destination & { words: string[]; zones?: string[] };

// Most specific first: a city beats its country, so "Munich, Germany" is Munich.
const PLACES: Place[] = [
  { key: "london", label: "London", country: "GB", at: [51.5074, -0.1278], hue: "#c8102e", photo: "london", words: ["london"], zones: ["Europe/London"] },
  { key: "scotland", label: "Scotland", country: "GB", at: [55.9533, -3.1883], hue: "#2a5db0", photo: "edinburgh", words: ["edinburgh", "glasgow", "scotland", "highlands", "inverness", "skye", "aberdeen"] },
  { key: "munich", label: "Munich", country: "DE", at: [48.1372, 11.5756], hue: "#b7791f", photo: "munich", words: ["munich", "munchen", "bavaria", "bayern"] },
  { key: "london", label: "UK", country: "GB", at: [51.5074, -0.1278], hue: "#c8102e", photo: "london", words: ["uk", "england", "britain", "manchester", "liverpool", "oxford", "cambridge", "bath", "york", "brighton"] },
  { key: "berlin", label: "Germany", country: "DE", at: [52.52, 13.405], hue: "#4b5563", words: ["berlin", "germany", "hamburg", "cologne", "koln", "dresden", "frankfurt"], zones: ["Europe/Berlin"] },
  { key: "paris", label: "France", country: "FR", at: [48.8566, 2.3522], hue: "#3b5bdb", words: ["paris", "france", "lyon", "nice", "bordeaux", "marseille"], zones: ["Europe/Paris"] },
  { key: "rome", label: "Italy", country: "IT", at: [41.9028, 12.4964], hue: "#c2410c", words: ["rome", "roma", "italy", "florence", "venice", "milan", "naples", "sicily", "tuscany"], zones: ["Europe/Rome"] },
  { key: "amsterdam", label: "Netherlands", country: "NL", at: [52.3676, 4.9041], hue: "#dd6b20", words: ["amsterdam", "netherlands", "holland", "rotterdam", "utrecht"], zones: ["Europe/Amsterdam"] },
  { key: "copenhagen", label: "Denmark", country: "DK", at: [55.6761, 12.5683], hue: "#b91c1c", words: ["copenhagen", "kobenhavn", "denmark", "aarhus", "odense"], zones: ["Europe/Copenhagen"] },
  { key: "barcelona", label: "Spain", country: "ES", at: [41.3874, 2.1686], hue: "#d97706", words: ["barcelona", "spain", "madrid", "seville", "valencia", "granada"], zones: ["Europe/Madrid"] },
  { key: "newyork", label: "USA", country: "US", at: [40.7128, -74.006], hue: "#0f766e", words: ["new york", "nyc", "manhattan", "brooklyn", "usa", "america", "chicago", "boston"], zones: ["America/New_York"] },
  { key: "tokyo", label: "Japan", country: "JP", at: [35.6762, 139.6503], hue: "#be123c", words: ["tokyo", "japan", "kyoto", "osaka"], zones: ["Asia/Tokyo"] },
  { key: "mountains", label: "Mountains", hue: "#2f855a", words: ["alps", "ski", "skiing", "mountains", "switzerland", "austria", "dolomites", "norway", "fjords", "zermatt"], zones: ["Europe/Zurich", "Europe/Vienna", "Europe/Oslo"] },
  { key: "coast", label: "Coast", hue: "#0e7490", words: ["beach", "island", "islands", "greece", "crete", "mallorca", "portugal", "lisbon", "algarve", "coast", "seaside"], zones: ["Europe/Lisbon", "Europe/Athens"] },
];

const TRIP: Destination = { key: "trip", label: "Trip", hue: "#2563eb" };

/** Lower-case, accents dropped, so "München" reads as "munchen". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z])${word}($|[^a-z])`).test(text);

function find(text: string): Destination | undefined {
  const t = fold(text);
  const p = PLACES.find((place) => place.words.some((w) => hasWord(t, w)));
  return p && { key: p.key, label: p.label, hue: p.hue, photo: p.photo, at: p.at, country: p.country };
}

/**
 * Where a trip goes, for its mark and photo: the name says it best, then the days' cities.
 * The timezone comes last, because a new trip takes the planner's own until Claude sets it.
 */
export function destinationOf(trip: Trip): Destination {
  const byName = find(trip.name);
  if (byName) return byName;
  const byCity = find(trip.days.map((d) => `${d.city} ${d.place}`).join(" "));
  if (byCity) return byCity;
  const byZone = PLACES.find((p) => p.zones?.includes(trip.timezone));
  return byZone ? { key: byZone.key, label: byZone.label, hue: byZone.hue, photo: byZone.photo, at: byZone.at, country: byZone.country } : TRIP;
}

/**
 * Where a trip sits on the globe: its destination's centre (so "London, Glasgow & Edinburgh" sits on
 * London, not on the airport), else its first stop on the map, else nowhere yet.
 */
export function tripPlace(trip: Trip): [number, number] | undefined {
  const at = destinationOf(trip).at;
  if (at) return at;
  const first = trip.days.flatMap((d) => d.stops).find((s) => s.lat != null && s.lng != null && !s.offMap);
  return first ? [first.lat!, first.lng!] : undefined;
}
