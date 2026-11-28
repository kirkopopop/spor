import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as z from "zod";
import { rowsToTrip, TRIP_SELECT, type TripRow } from "@/lib/db";
import { validateDays, validateStops, type TripContext } from "./validate";
import airportRows from "@/assets/geo/airports.json";
import { flightBetween, type Airport } from "@/lib/flights";

// tur's tools for Claude. Every call runs as the signed-in person through RLS,
// so Claude sees and changes exactly what they could in the app. Writes are
// checked first and logged, so the app (and Claude next time) can see what changed.

const TIME = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM, 24-hour, local to the trip");
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

const travel = z.object({
  mode: z.enum(["walk", "tube", "train", "bus", "taxi", "bike", "plane", "car"]),
  min: z.number().int().min(1),
  text: z.string().optional().describe("How to get here, e.g. 'U3 Marienplatz → Odeonsplatz, then 5 min on foot'"),
  leave: TIME.optional().describe("Explicit leave-by; otherwise tur computes it (with 15 min slack before fixed stops)"),
  est: z.boolean().optional().describe("true if the minutes are a guess"),
});

const stopInput = z.object({
  id: z.string().uuid().optional().describe("Existing stop id to update; omit to create"),
  date: DATE.describe("Which day of the trip"),
  time: TIME,
  approx: z.boolean().optional(),
  name: z.string().min(1).max(200),
  kind: z.enum(["fixed", "normal", "optional"]).optional().describe("fixed = cannot move (train, booked slot); optional = drop first if late"),
  body: z.string().optional().describe("One paragraph shown in the stop's detail sheet"),
  more: z.string().optional().describe("Plan B, phone numbers, entrance tips. **bold** and blank-line paragraphs only"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maps_query: z.string().optional().describe("Google Maps search text"),
  go: travel.optional().describe("Travel to this stop from the previous one (for the first stop: from where you slept)"),
  journey: z.enum(["train", "bus", "plane"]).optional().describe("Set when the stop itself is a journey"),
  off_map: z.boolean().optional(),
  who: z.string().optional().describe("Name, when only one person does this stop"),
  fee: z.object({ label: z.string(), paid: z.boolean() }).optional(),
  booking_id: z.string().uuid().optional().describe("Booking row this stop depends on"),
  options: z
    .array(z.object({ id: z.string().optional(), name: z.string(), body: z.string().optional(), maps_query: z.string().optional() }))
    .optional(),
  pick_one: z.boolean().optional().describe("true turns options into a 'Pick one' choice for the travellers"),
  sort: z.number().int().optional(),
});

const AIRPORTS = new Map((airportRows as unknown as Airport[]).map((a) => [a[0], a]));

const ok = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 1) }] });
const fail = (errors: string[]) => ({
  isError: true,
  content: [{ type: "text" as const, text: `Nothing was written. Fix and retry:\n- ${errors.join("\n- ")}` }],
});

export function buildServer(sb: SupabaseClient, userId: string) {
  const server = new McpServer({ name: "tur", version: "1.0.0" });

  /**
   * Loads what the checks need and refuses a stale write: if anything in the trip
   * changed since Claude read it (a pick, a tick, Tanya's Claude), the revision moved.
   */
  async function context(tripId: string, expectedRevision: number): Promise<TripContext | string> {
    const { data: trip, error } = await sb
      .from("trips")
      .select("id, revision, start_date, end_date, days(id, date), bookings(id), stops(id)")
      .eq("id", tripId)
      .maybeSingle();
    if (error) return error.message;
    if (!trip) return `trip ${tripId} not found (use list_trips)`;
    if (trip.revision !== expectedRevision) {
      const recent = (await activity(tripId)).slice(0, 8).map((a) => `${a.who}: ${a.kind}`);
      return `the trip changed since you read it (revision ${expectedRevision} → ${trip.revision}; latest: ${recent.join("; ") || "—"}). Call get_trip again, keep those changes, and retry with the new revision.`;
    }
    return {
      tripId,
      startDate: trip.start_date,
      endDate: trip.end_date,
      days: new Map(trip.days.map((d: { id: string; date: string }) => [d.date, d.id])),
      bookingIds: new Set(trip.bookings.map((b: { id: string }) => b.id)),
      stopIds: new Set(trip.stops.map((s: { id: string }) => s.id)),
    };
  }

  async function revisionOf(tripId: string) {
    const { data } = await sb.from("trips").select("revision").eq("id", tripId).single();
    return data?.revision as number | undefined;
  }

  const REVISION = z.number().int().describe("trip.revision from your latest get_trip; a stale one is refused");

  async function log(tripId: string, kind: string, patch: unknown, targetId?: string) {
    await sb.from("activity_log").insert({ trip_id: tripId, actor: userId, kind, target_id: targetId ?? null, patch });
  }

  async function activity(tripId: string, since?: string) {
    let q = sb.from("activity_log").select("kind, target_id, patch, at, actor").eq("trip_id", tripId).order("at", { ascending: false }).limit(50);
    if (since) q = q.gt("at", since);
    const [{ data: rows }, { data: members }] = await Promise.all([q, sb.from("household_members").select("user_id, display_name")]);
    const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
    return (rows ?? []).map((r) => ({ at: r.at, who: names.get(r.actor) ?? "someone", kind: r.kind, target_id: r.target_id, change: r.patch }));
  }

  async function addMissingDays(tripId: string, start: string, end: string) {
    const dates: string[] = [];
    for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }
    await sb.from("days").upsert(dates.map((date) => ({ trip_id: tripId, date })), { onConflict: "trip_id,date", ignoreDuplicates: true });
  }

  server.registerTool(
    "list_trips",
    { title: "List trips", description: "All trips in the household: id, name, stage, dates.", annotations: { readOnlyHint: true } },
    async () => {
      const { data, error } = await sb.from("trips").select("id, name, stage, start_date, end_date, people").order("start_date");
      return error ? fail([error.message]) : ok(data);
    },
  );

  server.registerTool(
    "get_trip",
    {
      title: "Get trip",
      description:
        "The full current trip: its revision, days, stops (with ids), bookings, budget, spare ideas, expenses, the travellers' notes (requests to you are often here) and recent activity — their picks, ticks, moved times and added stops. Always call this before changing a trip and pass its revision as expected_revision; if a write says the trip changed, call this again.",
      inputSchema: { trip_id: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ trip_id }) => {
      const { data, error } = await sb.from("trips").select(TRIP_SELECT).eq("id", trip_id).maybeSingle();
      if (error) return fail([error.message]);
      if (!data) return fail([`trip ${trip_id} not found (use list_trips)`]);
      const trip = rowsToTrip(data as TripRow);
      const { data: members } = await sb.from("household_members").select("user_id, display_name");
      const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
      const stopName = new Map(trip.days.flatMap((d) => d.stops.map((s) => [s.id, `${d.date} ${s.time} ${s.name}`] as const)));
      const dayDate = new Map(trip.days.map((d) => [d.id, d.date]));
      const { notes = [], ...rest } = trip;
      return ok({
        revision: trip.revision,
        trip: rest,
        notes: notes.map((n) => ({
          id: n.id,
          by: n.via === "claude" ? `Claude (for ${(n.authorId && names.get(n.authorId)) || "someone"})` : (n.authorId && names.get(n.authorId)) || "someone",
          at: n.createdAt,
          on: n.stopId ? `stop ${stopName.get(n.stopId) ?? n.stopId}` : n.dayId ? `day ${dayDate.get(n.dayId)}` : "trip",
          body: n.body,
        })),
        recent_activity: await activity(trip_id),
      });
    },
  );

  server.registerTool(
    "get_activity_since",
    {
      title: "Activity since",
      description: "What changed in a trip after a time (ISO 8601): who ticked, picked, moved or added what.",
      inputSchema: { trip_id: z.string().uuid(), since: z.string().datetime({ offset: true }) },
      annotations: { readOnlyHint: true },
    },
    async ({ trip_id, since }) => ok(await activity(trip_id, since)),
  );

  server.registerTool(
    "create_trip",
    {
      title: "Create trip",
      description: "Create a trip in the household. Days are created for every date from start to end.",
      inputSchema: {
        name: z.string().min(1).max(120),
        start_date: DATE,
        end_date: DATE,
        timezone: z.string().describe("IANA zone of the destination, e.g. Europe/Berlin"),
        currency: z.enum(["EUR", "GBP", "DKK", "USD"]),
        people: z.array(z.string()).describe("First names of everyone travelling"),
        stage: z.enum(["idea", "planning", "live", "memory"]).default("planning"),
        summary: z.string().optional(),
      },
    },
    async (input) => {
      if (input.end_date < input.start_date) return fail(["end_date is before start_date"]);
      const { data: m } = await sb.from("household_members").select("household_id").eq("user_id", userId).limit(1).maybeSingle();
      if (!m) return fail(["you are not in a household"]);
      const { data: trip, error } = await sb.from("trips").insert({ ...input, household_id: m.household_id }).select("id").single();
      if (error) return fail([error.message]);
      await addMissingDays(trip.id, input.start_date, input.end_date);
      await log(trip.id, "claude.create_trip", { name: input.name });
      return ok({ trip_id: trip.id, revision: await revisionOf(trip.id) });
    },
  );

  server.registerTool(
    "update_trip",
    {
      title: "Update trip",
      description: "Change a trip's name, stage, dates, timezone, currency, people or summary. Extending dates adds days; shrinking is refused if a removed day has stops.",
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        name: z.string().min(1).max(120).optional(),
        stage: z.enum(["idea", "planning", "live", "memory"]).optional(),
        start_date: DATE.optional(),
        end_date: DATE.optional(),
        timezone: z.string().optional(),
        currency: z.enum(["EUR", "GBP", "DKK", "USD"]).optional(),
        people: z.array(z.string()).optional(),
        summary: z.string().optional(),
      },
    },
    async ({ trip_id, expected_revision, ...patch }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const start = patch.start_date ?? ctx.startDate;
      const end = patch.end_date ?? ctx.endDate;
      if (end < start) return fail(["end_date is before start_date"]);
      const dropped = [...ctx.days].filter(([date]) => date < start || date > end).map(([, id]) => id);
      if (dropped.length) {
        const { data: stranded } = await sb.from("stops").select("name").in("day_id", dropped);
        if (stranded?.length) {
          return fail([`days outside ${start} to ${end} still have stops: ${stranded.map((s) => s.name).join(", ")}; move or delete them first`]);
        }
      }
      const { error } = await sb.from("trips").update(patch).eq("id", trip_id);
      if (error) return fail([error.message]);
      if (dropped.length) await sb.from("days").delete().in("id", dropped);
      await addMissingDays(trip_id, start, end);
      await log(trip_id, "claude.update_trip", patch);
      return ok({ updated: Object.keys(patch), revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "upsert_days",
    {
      title: "Set days",
      description: `Set day titles (max 40 characters; detail goes in intro), city (matches spare ideas), place (shown under the date), intro and the rain plan (1–3 short sentences: what to swap if wet). Every day should have a rain plan.`,
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        days: z.array(
          z.object({
            date: DATE,
            title: z.string().optional(),
            city: z.string().optional(),
            place: z.string().optional(),
            intro: z.string().optional(),
            rain: z.array(z.string()).optional(),
          }),
        ),
      },
    },
    async ({ trip_id, expected_revision, days }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const { rows, errors } = validateDays(days, ctx);
      if (errors.length) return fail(errors);
      const { error } = await sb.from("days").upsert(rows, { onConflict: "trip_id,date" });
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_days", { dates: days.map((d) => d.date) });
      return ok({ saved: rows.length, revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "upsert_stops",
    {
      title: "Add or update stops",
      description:
        "Create or update stops in one batch (all or nothing). Pass id to update an existing stop (ids come from get_trip). Rules that make a plan work on the day: every stop has a time; mark fixed what cannot move; at least two optional stops per day; every hop over 5 minutes gets travel (go) with real journey times; the first stop's go is the trip from where you slept; ≥15 min slack before fixed times; every booked thing links its booking_id.",
      inputSchema: { trip_id: z.string().uuid(), expected_revision: REVISION, stops: z.array(stopInput).min(1) },
    },
    async ({ trip_id, expected_revision, stops }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const { rows, errors } = validateStops(stops, ctx);
      if (errors.length) return fail(errors);
      const { error } = await sb.from("stops").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_stops", { stops: rows.map((r) => ({ id: r.id, name: r.name, time: r.time })) });
      return ok({ saved: rows.map((r) => ({ id: r.id, name: r.name })), revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "delete_stops",
    {
      title: "Delete stops",
      description: "Delete stops by id. Check recent activity first: a traveller may have ticked or picked one.",
      inputSchema: { trip_id: z.string().uuid(), expected_revision: REVISION, stop_ids: z.array(z.string().uuid()).min(1) },
      annotations: { destructiveHint: true },
    },
    async ({ trip_id, expected_revision, stop_ids }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const { data, error } = await sb.from("stops").delete().eq("trip_id", trip_id).in("id", stop_ids).select("id, name");
      if (error) return fail([error.message]);
      await log(trip_id, "claude.delete_stops", { stops: data });
      return ok({ deleted: data?.length ?? 0, revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "upsert_bookings",
    {
      title: "Add or update bookings",
      description: "The to-book checklist. Pass id to update. status 'booked' only once it really is booked. private_ref holds booking references; it stays in the private database.",
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        bookings: z.array(
          z.object({
            id: z.string().uuid().optional(),
            title: z.string().min(1),
            note: z.string().optional().describe("One line"),
            status: z.enum(["to_book", "booked"]),
            est_cost: z.number().nonnegative().optional(),
            actual_cost: z.number().nonnegative().optional(),
            due_by: DATE.optional(),
            private_ref: z.string().optional(),
            url: z.string().url().optional(),
            sort: z.number().int().optional(),
          }),
        ),
      },
    },
    async ({ trip_id, expected_revision, bookings }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const strangers = bookings.filter((b) => b.id && !ctx.bookingIds.has(b.id)).map((b) => `"${b.title}": booking ${b.id} is not in this trip; omit id to create`);
      if (strangers.length) return fail(strangers);
      const rows = bookings.map((b, i) => ({ ...b, id: b.id ?? crypto.randomUUID(), trip_id, sort: b.sort ?? i }));
      const { error } = await sb.from("bookings").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_bookings", { bookings: rows.map((r) => ({ id: r.id, title: r.title, status: r.status })) });
      return ok({ saved: rows.map((r) => ({ id: r.id, title: r.title })), revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "set_budget",
    {
      title: "Set budget",
      description: "Replace the trip's planned budget: one line per category, total for the whole party. Should cover every hotel night and every booking.",
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        lines: z.array(z.object({ category: z.string().min(1), label: z.string().min(1), planned: z.number().nonnegative() })),
      },
    },
    async ({ trip_id, expected_revision, lines }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const del = await sb.from("budget_lines").delete().eq("trip_id", trip_id);
      if (del.error) return fail([del.error.message]);
      const { error } = await sb.from("budget_lines").insert(lines.map((l) => ({ ...l, trip_id })));
      if (error) return fail([error.message]);
      await log(trip_id, "claude.set_budget", { lines });
      return ok({ saved: lines.length, revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "upsert_spare_ideas",
    {
      title: "Add spare-time ideas",
      description: "Spare-time and rain ideas, tagged by city (must match the days' city), indoor or not, and minutes. Each city should have at least three indoor ideas.",
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        ideas: z.array(
          z.object({
            id: z.string().uuid().optional(),
            name: z.string().min(1),
            city: z.string(),
            area: z.string().optional(),
            note: z.string().optional(),
            indoor: z.boolean(),
            minutes: z.number().int().min(5),
            lat: z.number().optional(),
            lng: z.number().optional(),
            maps_query: z.string().optional(),
          }),
        ),
      },
    },
    async ({ trip_id, expected_revision, ideas }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      const rows = ideas.map((i) => ({ ...i, id: i.id ?? crypto.randomUUID(), trip_id }));
      const { error } = await sb.from("spare_ideas").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_spare_ideas", { names: ideas.map((i) => i.name) });
      return ok({ saved: rows.length, revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "add_note",
    {
      title: "Add a note",
      description:
        "Leave a short note on the trip, a day or a stop, shown to the travellers in tur. Use it to answer their notes (\"Moved the museum to Wednesday as you asked\") or flag something to decide. Keep it to one or two sentences.",
      inputSchema: {
        trip_id: z.string().uuid(),
        expected_revision: REVISION,
        body: z.string().min(1).max(1000),
        stop_id: z.string().uuid().optional(),
        date: DATE.optional().describe("Put the note on this day"),
      },
    },
    async ({ trip_id, expected_revision, body, stop_id, date }) => {
      const ctx = await context(trip_id, expected_revision);
      if (typeof ctx === "string") return fail([ctx]);
      if (stop_id && !ctx.stopIds.has(stop_id)) return fail([`stop ${stop_id} is not in this trip`]);
      const dayId = date ? ctx.days.get(date) : undefined;
      if (date && !dayId) return fail([`no day ${date} in this trip`]);
      const { error } = await sb.from("notes").insert({ trip_id, body, stop_id: stop_id ?? null, day_id: dayId ?? null, via: "claude" });
      if (error) return fail([error.message]);
      return ok({ saved: true, revision: await revisionOf(trip_id) });
    },
  );

  server.registerTool(
    "list_flights",
    {
      title: "List flights",
      description:
        "Every flight the household has logged for travel stats: id, who, date, from and to (IATA), km, air time in minutes (null = estimated from distance), airline (null = not given).",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [{ data, error }, { data: members }] = await Promise.all([
        sb.from("flights").select("id, user_id, flown_on, from_code, to_code, km, minutes, airline").order("flown_on"),
        sb.from("household_members").select("user_id, display_name"),
      ]);
      if (error) return fail([error.message]);
      const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
      return ok(
        (data ?? []).map((f) => ({ id: f.id, who: names.get(f.user_id) ?? "someone", date: f.flown_on, from: f.from_code, to: f.to_code, km: f.km, minutes: f.minutes, airline: f.airline })),
      );
    },
  );

  server.registerTool(
    "log_flights",
    {
      title: "Log flights",
      description:
        "Add flights to the travellers' travel stats (flights, air time, km, countries flown to). Log each leg of a connection separately, one row per person per leg. Call list_flights first so a flight isn't logged twice. Use when a flight is booked or the travellers tell you about past flights.",
      inputSchema: {
        flights: z
          .array(
            z.object({
              date: DATE.describe("Departure date, local"),
              from: z.string().regex(/^[A-Za-z]{3}$/).describe("IATA airport code, e.g. CPH"),
              to: z.string().regex(/^[A-Za-z]{3}$/),
              minutes: z.number().int().min(1).max(1440).optional().describe("Scheduled air time; omit to estimate from distance"),
              airline: z.string().trim().min(1).max(60).optional().describe("Airline operating the flight, e.g. SAS, Norwegian"),
              people: z.array(z.string()).optional().describe("First names of who flew; defaults to the signed-in person"),
            }),
          )
          .min(1)
          .max(100),
      },
    },
    async ({ flights }) => {
      const { data: members } = await sb.from("household_members").select("user_id, display_name");
      const first = (n: string) => n.trim().toLowerCase().split(/\s+/)[0];
      const byName = (n: string) => (members ?? []).find((m) => first(m.display_name) === first(n))?.user_id as string | undefined;
      const errors: string[] = [];
      const rows = flights.flatMap((f, i) => {
        const from = AIRPORTS.get(f.from.toUpperCase());
        const to = AIRPORTS.get(f.to.toUpperCase());
        if (!from) errors.push(`flight ${i + 1}: no airport ${f.from}`);
        if (!to) errors.push(`flight ${i + 1}: no airport ${f.to}`);
        const who: [string, string | undefined][] = f.people?.length ? f.people.map((p) => [p, byName(p)]) : [["you", userId]];
        for (const [p, id] of who) if (!id) errors.push(`flight ${i + 1}: ${p} is not in the household`);
        if (!from || !to) return [];
        const between = flightBetween(from, to);
        return who.map(([, id]) => ({
          user_id: id,
          flown_on: f.date,
          from_code: between.from,
          to_code: between.to,
          from_country: between.fromCountry,
          to_country: between.toCountry,
          km: between.km,
          minutes: f.minutes ?? null,
          airline: f.airline ?? null,
        }));
      });
      if (errors.length) return fail(errors);
      const { data, error } = await sb.from("flights").insert(rows).select("id");
      return error ? fail([error.message]) : ok({ saved: data?.length ?? 0 });
    },
  );

  server.registerTool(
    "remove_flight",
    {
      title: "Remove a flight",
      description: "Remove a logged flight by id (from list_flights), e.g. one logged twice or cancelled.",
      inputSchema: { id: z.string().uuid() },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const { data, error } = await sb.from("flights").delete().eq("id", id).select("id");
      if (error) return fail([error.message]);
      return data?.length ? ok({ removed: true }) : fail([`flight ${id} not found (use list_flights)`]);
    },
  );

  return server;
}
