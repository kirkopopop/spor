/** [name, iso, lat, lng, population (metro where known), capital 1/0, other names "|"], from assets/geo/cities.json */
export type CityRef = [string, string, number, number, number, 0 | 1, string];

/** A city someone has been to, as the highlights need it. */
export type VisitedCity = { name: string; country: string; lat?: number; lng?: number };

export type Highlight =
  | { kind: "north" | "south"; city: string; country: string; lat: number }
  | { kind: "biggest" | "smallest"; city: string; country: string; population: number }
  | { kind: "farthest"; city: string; country: string; km: number }
  | { kind: "capitals"; count: number; names: string[] };

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss").toLowerCase().trim();
const rad = (d: number) => (d * Math.PI) / 180;
function km(a: [number, number], b: [number, number]) {
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/**
 * Finds each visited city in the reference by its name (or another name for it) in its country.
 * Not by distance: a district or a town next door would take on the big city's population.
 */
export function matchCities(visited: VisitedCity[], refs: CityRef[]) {
  const byName = new Map<string, CityRef>();
  for (const r of refs) {
    for (const n of [r[0], ...(r[6] ? r[6].split("|") : [])]) {
      const k = `${r[1]}:${fold(n)}`;
      const had = byName.get(k);
      if (!had || r[4] > had[4]) byName.set(k, r); // namesakes in one country: the bigger one
    }
  }
  return visited.map((v) => {
    const ref = byName.get(`${v.country}:${fold(v.name)}`);
    const lat = v.lat ?? ref?.[2];
    const lng = v.lng ?? ref?.[3];
    return { ...v, lat, lng, ref };
  });
}

/**
 * The interesting extremes of where someone has been: furthest north and south, the biggest and
 * smallest city, the one furthest from home, and the capitals. Each shows only when it says
 * something: two cities at least, and different cities for a pair.
 */
export function highlights(visited: VisitedCity[], refs: CityRef[], home?: [number, number]): Highlight[] {
  const cities = matchCities(visited, refs);
  const placed = cities.filter((c): c is typeof c & { lat: number; lng: number } => c.lat != null && c.lng != null);
  const sized = cities.filter((c) => c.ref && c.ref[4] > 0);
  const out: Highlight[] = [];
  if (placed.length >= 2) {
    const n = placed.reduce((a, c) => (c.lat > a.lat ? c : a));
    const s = placed.reduce((a, c) => (c.lat < a.lat ? c : a));
    if (n !== s) out.push({ kind: "north", city: n.name, country: n.country, lat: n.lat }, { kind: "south", city: s.name, country: s.country, lat: s.lat });
  }
  if (sized.length >= 2) {
    const big = sized.reduce((a, c) => (c.ref![4] > a.ref![4] ? c : a));
    const small = sized.reduce((a, c) => (c.ref![4] < a.ref![4] ? c : a));
    if (big !== small) {
      out.push({ kind: "biggest", city: big.name, country: big.country, population: big.ref![4] });
      out.push({ kind: "smallest", city: small.name, country: small.country, population: small.ref![4] });
    }
  }
  if (home && placed.length) {
    const far = placed.map((c) => ({ c, d: km(home, [c.lat, c.lng]) })).reduce((a, x) => (x.d > a.d ? x : a));
    if (far.d >= 100) out.push({ kind: "farthest", city: far.c.name, country: far.c.country, km: far.d });
  }
  const capitals = new Map<CityRef, string>(); // one per city, by the first name it was logged under
  for (const c of cities) if (c.ref?.[5] && !capitals.has(c.ref)) capitals.set(c.ref, c.name);
  if (capitals.size) out.push({ kind: "capitals", count: capitals.size, names: [...capitals.values()] });
  return out;
}

/** Population for reading: 8.6 million, 237,000, 2,500. */
export function population(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")} million`;
  if (n >= 10_000) return (Math.round(n / 1000) * 1000).toLocaleString("en-GB");
  return n.toLocaleString("en-GB");
}

export const latitude = (lat: number) => `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? "N" : "S"}`;
