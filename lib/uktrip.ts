import vm from "node:vm";
import { randomUUID } from "node:crypto";
import type { Stage, Trip } from "./types";

// Converts a UkTrip-format src/trip-data.js into a tur Trip. Node-only (vm);
// used by scripts/import-uktrip.ts and tests, never shipped to the browser.

type UkStop = {
  t: string; n: string; p?: string; k?: "fixed" | "opt"; more?: string;
  ll?: [number, number]; q?: string; off?: boolean; who?: string; chk?: string;
  tr?: "train" | "bus" | "plane"; fee?: [string, string]; booked?: boolean;
  go?: { m: string; min: number; txt?: string; leave?: string; est?: boolean };
  subs?: [string, string, string][]; pick?: string;
};
type UkDay = { id: string; iso: string; city: string; place: string; title: string; intro?: string; rain?: string[]; stops: UkStop[] };
type UkData = {
  TRIP: { key?: string; name: string; tz: string; people?: string[] };
  DAYS: UkDay[];
  SPARE: [string, string, string, string, boolean, number, [number, number] | null, string][];
  BUDGET: [string, string[], number, number][];
  CHECK: [string, string, string, string, boolean][];
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// UkTrip's `more` is small HTML; tur keeps **bold** and paragraphs only.
function htmlToText(html?: string) {
  if (!html) return undefined;
  return html
    .replace(/<\/p>\s*<p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/?b>/g, "**")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)); // drop undefined keys

export function convertUkTrip(source: string, stage: Stage = "memory"): Trip {
  const ctx: { __?: UkData } = {};
  vm.runInNewContext(`${source}\n;this.__ = {TRIP, DAYS, SPARE, BUDGET, CHECK};`, ctx, { timeout: 1000 });
  const { TRIP, DAYS, SPARE, BUDGET, CHECK } = ctx.__!;

  const bookedChecks = new Set(DAYS.flatMap((d) => d.stops).filter((s) => s.booked && s.chk).map((s) => s.chk));
  const people = TRIP.people ?? [];

  const days = DAYS.map((d) => ({
    id: randomUUID(),
    date: d.iso,
    title: d.title,
    city: d.city,
    place: d.place,
    intro: d.intro,
    rain: d.rain ?? [],
    stops: d.stops.map((s) =>
      clean({
        id: randomUUID(),
        time: s.t.replace("~", ""),
        approx: s.t.startsWith("~") || undefined,
        name: s.n,
        kind: s.k === "fixed" ? ("fixed" as const) : s.k === "opt" ? ("optional" as const) : ("normal" as const),
        body: s.p,
        more: htmlToText(s.more),
        lat: s.ll?.[0],
        lng: s.ll?.[1],
        mapsQuery: s.q,
        go: s.go && { mode: s.go.m, min: s.go.min, text: s.go.txt, leave: s.go.leave, est: s.go.est },
        journey: s.tr,
        offMap: s.off,
        who: s.who,
        fee: s.fee && { label: s.fee[0], paid: s.fee[1] === "paid" },
        bookingId: s.chk,
        options: s.subs?.map((o) => ({ id: randomUUID(), name: o[0], body: o[1], mapsQuery: o[2] })),
        pickOne: s.pick ? true : undefined,
      }),
    ),
  }));

  return clean({
    id: slug(TRIP.key || TRIP.name),
    name: TRIP.name,
    stage,
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    timezone: TRIP.tz,
    currency: TRIP.tz === "Europe/London" ? "GBP" : "EUR",
    people,
    days,
    bookings: CHECK.map(([id, title, note, , done]) => ({
      id,
      title,
      note: note || undefined,
      status: done || bookedChecks.has(id) ? ("booked" as const) : ("to_book" as const),
    })),
    // UkTrip budgets are per person as [low, high]; tur plans the high end for everyone.
    budget: BUDGET.map(([label, cats, , high]) => ({ category: cats[0], label, planned: high * Math.max(1, people.length) })),
    spare: SPARE.map(([name, city, area, note, indoor, minutes, ll, q]) => ({
      id: slug(name),
      name,
      city,
      area,
      note,
      indoor: !!indoor,
      minutes,
      lat: ll?.[0],
      lng: ll?.[1],
      mapsQuery: q,
    })),
  }) as Trip;
}
