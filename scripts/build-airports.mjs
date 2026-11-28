// Usage: node scripts/build-airports.mjs <path/to/ourairports/airports.csv>
// Slims OurAirports (public domain) to airports with scheduled service and an IATA code, as
// [iata, name, city, country, lat, lng] rows in assets/geo/airports.json. Rerun to refresh.
import { readFileSync, writeFileSync } from "node:fs";

const [src] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/build-airports.mjs <airports.csv>");
  process.exit(1);
}

/** One CSV line into fields: quoted fields may hold commas and doubled quotes. */
function fields(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted && c === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const [head, ...lines] = readFileSync(src, "utf8").split(/\r?\n/).filter(Boolean);
const col = Object.fromEntries(fields(head).map((h, i) => [h, i]));
const round = (n) => Math.round(Number(n) * 1000) / 1000;
const rows = [];
for (const line of lines) {
  const f = fields(line);
  const iata = f[col.iata_code];
  const type = f[col.type];
  if (!/^[A-Z]{3}$/.test(iata) || f[col.scheduled_service] !== "yes" || !/_airport$/.test(type)) continue;
  const rank = type === "large_airport" ? 0 : type === "medium_airport" ? 1 : 2;
  rows.push([rank, iata, f[col.name], f[col.municipality], f[col.iso_country], round(f[col.latitude_deg]), round(f[col.longitude_deg])]);
}
// Larger airports first, so a code shared by two rows resolves to the one people fly to.
rows.sort((a, b) => a[0] - b[0]);
const seen = new Set();
const unique = rows
  .filter((r) => !seen.has(r[1]) && seen.add(r[1]))
  .map((r) => r.slice(1))
  .sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync("assets/geo/airports.json", JSON.stringify(unique));
console.log(`${unique.length} airports`);
