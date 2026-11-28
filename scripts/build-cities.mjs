// Slims Natural Earth's 1:10m populated places into assets/geo/cities.json, for travel highlights.
// Usage: node scripts/build-cities.mjs <ne_10m_populated_places_simple.geojson>
// Each city is [name, iso, lat, lng, population, capital (1/0), other names joined by "|"];
// coordinates to 0.01°. Research and weather stations are left out.
import { readFileSync, writeFileSync } from "node:fs";

const NO_CODE = { Somaliland: "SO", Kosovo: "XK", "Northern Cyprus": "CY" };
const SKIP = new Set(["Scientific station", "Meteorological Station", "Historic place"]);

const src = JSON.parse(readFileSync(process.argv[2], "utf8"));
const r = (n) => Math.round(n * 100) / 100;
const out = [];
for (const { properties: p } of src.features) {
  if (SKIP.has(p.featurecla)) continue;
  const iso = /^[A-Z]{2}$/.test(p.iso_a2) ? p.iso_a2 : NO_CODE[p.adm0name];
  if (!iso) continue;
  const others = [...new Set([p.nameascii, p.namealt, p.namepar, p.meganame, p.ls_name].flatMap((n) => (n ? n.split("|") : [])))]
    .map((n) => n.trim().replace(/\d+$/, ""))
    .filter((n) => n.length > 1 && n !== p.name);
  const capital = p.featurecla.startsWith("Admin-0 capital") || p.adm0cap === 1 ? 1 : 0;
  out.push([p.name, iso, r(p.latitude), r(p.longitude), p.pop_max || 0, capital, others.join("|")]);
}
writeFileSync(new URL("../assets/geo/cities.json", import.meta.url), JSON.stringify(out));
console.log(`${out.length} cities`);
