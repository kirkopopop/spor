// Usage: node scripts/seed-sql.ts <owner-email> [out.sql]
// Turns every trip in data/seed/*.json into one SQL transaction (household,
// sign-up allowlist, trips). Output is private: it stays under data/seed/ (gitignored).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedSql } from "../lib/seedSql.ts";
import type { Trip } from "../lib/types.ts";

const [email, out = "data/seed/seed.sql"] = process.argv.slice(2);
if (!email) {
  console.error("usage: node scripts/seed-sql.ts <owner-email> [out.sql]");
  process.exit(1);
}

const dir = "data/seed";
const trips: Trip[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

writeFileSync(out, seedSql(trips, { household: "Kopytov", members: [{ email, name: "Kirill", role: "owner" }] }));
console.log(`${trips.map((t) => t.name).join(", ")} → ${out}`);
