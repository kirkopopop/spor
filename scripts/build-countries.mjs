// Slims Natural Earth's 1:50m admin-0 countries into assets/geo/countries-50m.json.
// Usage: node scripts/build-countries.mjs <ne_50m_admin_0_countries.geojson>
// Keeps `iso` (ISO_A2_EH, so France and Norway keep their codes) and `name`, rounds to 0.01°,
// and merges pieces that share a code into one feature: Somaliland into Somalia, N. Cyprus into
// Cyprus, Australia's small territories into Australia. Pieces with no code at all are left out.
import { readFileSync, writeFileSync } from "node:fs";

const FOLD = { Somaliland: "SO", "N. Cyprus": "CY" };

const src = JSON.parse(readFileSync(process.argv[2], "utf8"));
const r = (n) => Math.round(n * 100) / 100;
const ring = (pts) => {
  const out = [];
  for (const [x, y] of pts) {
    const p = [r(x), r(y)];
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : undefined;
};
const polygon = (rings) => {
  const out = rings.map(ring);
  return out[0] ? out.filter(Boolean) : undefined; // an outer ring rounded away drops the piece
};

const byIso = new Map();
for (const f of src.features) {
  const p = f.properties;
  const iso = FOLD[p.NAME] ?? p.ISO_A2_EH;
  if (!/^[A-Z]{2}$/.test(iso)) continue;
  const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map(polygon).filter(Boolean);
  if (!polys.length) continue;
  const main = !FOLD[p.NAME] && p.ISO_A2 !== "-99"; // the country itself names the feature
  const cur = byIso.get(iso);
  if (cur) {
    cur.polys.push(...polys);
    if (main) cur.name = p.NAME;
  } else byIso.set(iso, { name: p.NAME, polys });
}

const features = [...byIso].map(([iso, { name, polys }]) => ({
  type: "Feature",
  properties: { iso, name },
  geometry: polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys },
}));
writeFileSync(new URL("../assets/geo/countries-50m.json", import.meta.url), JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${features.length} countries`);
