import { randomUUID } from "node:crypto";
import type { Trip } from "./types";

// Builds one SQL transaction that creates the household, its sign-up allowlist
// and the given trips. Node-only; output holds private trip data, so it is
// written under data/seed/ (gitignored) and pasted into the Supabase SQL editor.

type Member = { email: string; name: string; role: "owner" | "member" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marks a value for a jsonb column; plain string arrays go to text[] columns. */
class Json {
  readonly value: unknown;
  constructor(value: unknown) {
    this.value = value; // no parameter property: the script runs under Node's type stripping
  }
}
const json = (v: unknown) => (v == null ? null : new Json(v));

function lit(v: unknown): string {
  if (v === undefined || v === null) return "null";
  if (v instanceof Json) return `${lit(JSON.stringify(v.value))}::jsonb`;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.length ? `array[${v.map(lit).join(", ")}]::text[]` : "'{}'::text[]";
  if (typeof v === "object") throw new Error("objects must be wrapped with json()");
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insert(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  return `insert into ${table} (${cols.join(", ")}) values (${cols.map((c) => lit(row[c])).join(", ")});`;
}

export function seedSql(trips: Trip[], opts: { household: string; members: Member[] }): string {
  const ids = new Map<string, string>();
  const id = (old: string) => {
    if (UUID.test(old)) return old;
    if (!ids.has(old)) ids.set(old, randomUUID());
    return ids.get(old)!;
  };
  const scoped = (tripId: string, old: string) => id(`${tripId}:${old}`);

  const hh = randomUUID();
  const out = ["begin;", insert("public.households", { id: hh, name: opts.household })];
  for (const m of opts.members) {
    out.push(insert("private.allowed_emails", { email: m.email.toLowerCase(), household_id: hh, display_name: m.name, role: m.role }));
  }

  for (const t of trips) {
    const tid = id(t.id);
    out.push(
      insert("public.trips", {
        id: tid, household_id: hh, name: t.name, stage: t.stage, start_date: t.startDate || null,
        end_date: t.endDate || null, timezone: t.timezone, currency: t.currency, people: t.people, summary: t.summary,
      }),
    );
    t.bookings.forEach((b, i) =>
      out.push(
        insert("public.bookings", {
          id: scoped(t.id, `booking:${b.id}`), trip_id: tid, title: b.title, note: b.note, status: b.status,
          est_cost: b.estCost, sort: i,
        }),
      ),
    );
    for (const d of t.days) {
      const did = scoped(t.id, `day:${d.id}`);
      out.push(
        insert("public.days", {
          id: did, trip_id: tid, date: d.date, title: d.title, city: d.city, place: d.place, intro: d.intro, rain: d.rain,
        }),
      );
      d.stops.forEach((s, i) =>
        out.push(
          insert("public.stops", {
            id: id(s.id), trip_id: tid, day_id: did, time: s.time, approx: !!s.approx, name: s.name, kind: s.kind,
            body: s.body, more: s.more, lat: s.lat, lng: s.lng, maps_query: s.mapsQuery, go: json(s.go),
            journey: s.journey, off_map: !!s.offMap, who: s.who, fee: json(s.fee),
            booking_id: s.bookingId ? scoped(t.id, `booking:${s.bookingId}`) : null,
            options: json(s.options ?? []), pick_one: !!s.pickOne, sort: i,
          }),
        ),
      );
    }
    for (const b of t.budget) {
      out.push(insert("public.budget_lines", { trip_id: tid, category: b.category, label: b.label, planned: b.planned }));
    }
    for (const s of t.spare) {
      out.push(
        insert("public.spare_ideas", {
          trip_id: tid, name: s.name, city: s.city, area: s.area, note: s.note, indoor: s.indoor, minutes: s.minutes,
          lat: s.lat, lng: s.lng, maps_query: s.mapsQuery,
        }),
      );
    }
  }
  out.push("commit;");
  return out.join("\n") + "\n";
}
