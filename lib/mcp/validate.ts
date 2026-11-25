import { randomUUID } from "node:crypto";

// Checks on Claude's writes that the database can't express or would report badly.
// Every error names the stop or day, so Claude can fix just that one and retry.

export const DAY_TITLE_MAX = 40; // keeps the day header to one line, so the plan stays high on the screen

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const MODES = ["walk", "tube", "train", "bus", "taxi", "bike", "plane", "car"] as const;

export type TripContext = {
  tripId: string;
  startDate: string;
  endDate: string;
  days: Map<string, string>; // date → day id
  bookingIds: Set<string>;
  stopIds: Set<string>; // stops already in this trip
};

export type StopInput = {
  id?: string;
  date: string;
  time: string;
  approx?: boolean;
  name: string;
  kind?: "fixed" | "normal" | "optional";
  body?: string;
  more?: string;
  lat?: number;
  lng?: number;
  maps_query?: string;
  go?: { mode: string; min: number; text?: string; leave?: string; est?: boolean };
  journey?: "train" | "bus" | "plane";
  off_map?: boolean;
  who?: string;
  fee?: { label: string; paid: boolean };
  booking_id?: string;
  options?: { id?: string; name: string; body?: string; maps_query?: string }[];
  pick_one?: boolean;
  sort?: number;
};

export type StopRow = Omit<StopInput, "date" | "options" | "maps_query"> & {
  id: string;
  trip_id: string;
  day_id: string;
  maps_query: string | null;
  options: { id: string; name: string; body?: string; mapsQuery?: string }[];
};

export function validateStops(stops: StopInput[], ctx: TripContext) {
  const errors: string[] = [];
  const rows: StopRow[] = [];
  for (const s of stops) {
    const problems: string[] = [];
    const dayId = ctx.days.get(s.date);
    if (!dayId) problems.push(`no day ${s.date} in this trip; add it with upsert_days first`);
    if (!TIME.test(s.time)) problems.push(`time must be HH:MM (got ${s.time})`);
    if (s.booking_id && !ctx.bookingIds.has(s.booking_id))
      problems.push(`booking ${s.booking_id} is not in this trip; create it with upsert_bookings first`);
    if (s.id && !ctx.stopIds.has(s.id)) problems.push(`stop ${s.id} is not in this trip; omit id to create a new stop`);
    if (s.pick_one && (s.options?.length ?? 0) < 2) problems.push(`"pick one" needs at least 2 options`);
    if (s.go) {
      if (!MODES.includes(s.go.mode as (typeof MODES)[number])) problems.push(`travel mode must be one of ${MODES.join(", ")}`);
      if (!(s.go.min >= 1)) problems.push("travel minutes must be 1 or more");
      if (s.go.leave && !TIME.test(s.go.leave)) problems.push("leave time must be HH:MM");
    }
    if (problems.length) {
      errors.push(...problems.map((p) => `"${s.name}": ${p}`));
      continue;
    }

    const { date: _date, options, maps_query, ...rest } = s;
    void _date;
    rows.push({
      ...rest,
      id: s.id ?? randomUUID(),
      trip_id: ctx.tripId,
      day_id: dayId!,
      maps_query: maps_query ?? null,
      options: (options ?? []).map((o) => ({
        id: o.id ?? randomUUID(),
        name: o.name,
        ...(o.body ? { body: o.body } : {}),
        ...(o.maps_query ? { mapsQuery: o.maps_query } : {}),
      })),
    });
  }
  return { rows, errors };
}

export type DayInput = { date: string; title?: string; city?: string; place?: string; intro?: string; rain?: string[] };

export function validateDays(days: DayInput[], ctx: TripContext) {
  const errors: string[] = [];
  const rows: (DayInput & { id?: string; trip_id: string })[] = [];
  for (const d of days) {
    if (d.date < ctx.startDate || d.date > ctx.endDate) {
      errors.push(`${d.date} is outside the trip (${ctx.startDate} to ${ctx.endDate}); change the trip dates first`);
      continue;
    }
    if ((d.title?.length ?? 0) > DAY_TITLE_MAX) {
      errors.push(`${d.date}: title is over ${DAY_TITLE_MAX} characters; put the detail in intro`);
      continue;
    }
    const id = ctx.days.get(d.date);
    rows.push({ ...d, trip_id: ctx.tripId, ...(id ? { id } : {}) });
  }
  return { rows, errors };
}
