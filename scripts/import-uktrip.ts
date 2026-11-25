// Usage: node scripts/import-uktrip.ts <trip-data.js> <out.json> [stage]
// The output holds booking notes and phone numbers: keep it out of git
// (data/seed/ is gitignored).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { convertUkTrip } from "../lib/uktrip.ts";
import type { Stage } from "../lib/types.ts";

const [src, out, stage = "memory"] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node scripts/import-uktrip.ts <trip-data.js> <out.json> [stage]");
  process.exit(1);
}

const trip = convertUkTrip(readFileSync(src, "utf8"), stage as Stage);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(trip, null, 2));
const stops = trip.days.reduce((n, d) => n + d.stops.length, 0);
console.log(`${trip.name}: ${trip.days.length} days, ${stops} stops, ${trip.bookings.length} bookings → ${out}`);
