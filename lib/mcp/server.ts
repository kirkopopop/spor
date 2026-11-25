import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as z from "zod";
import { rowsToTrip, TRIP_SELECT, type TripRow } from "@/lib/db";
import { validateDays, validateStops, type TripContext } from "./validate";

// spor's tools for Claude. Every call runs as the signed-in person through RLS,
// so Claude sees and changes exactly what they could in the app. Writes are
// checked first and logged, so the app (and Claude next time) can see what changed.

const TIME = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM, 24-hour, local to the trip");
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

const travel = z.object({
  mode: z.enum(["walk", "tube", "train", "bus", "taxi", "bike", "plane", "car"]),
  min: z.number().int().min(1),
  text: z.string().optional().describe("How to get here, e.g. 'U3 Marienplatz → Odeonsplatz, then 5 min on foot'"),
  leave: TIME.optional().describe("Explicit leave-by; otherwise spor computes it (with 15 min slack before fixed stops)"),
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

const ok = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 1) }] });
const fail = (errors: string[]) => ({
  isError: true,
  content: [{ type: "text" as const, text: `Nothing was written. Fix and retry:\n- ${errors.join("\n- ")}` }],
});

export function buildServer(sb: SupabaseClient, userId: string) {
  const server = new McpServer({ name: "spor", version: "1.0.0" });

  async function context(tripId: string): Promise<TripContext | string> {
    const { data: trip, error } = await sb
      .from("trips")
      .select("id, start_date, end_date, days(id, date), bookings(id), stops(id)")
      .eq("id", tripId)
      .maybeSingle();
    if (error) return error.message;
    if (!trip) return `trip ${tripId} not found (use list_trips)`;
    return {
      tripId,
      startDate: trip.start_date,
      endDate: trip.end_date,
      days: new Map(trip.days.map((d: { id: string; date: string }) => [d.date, d.id])),
      bookingIds: new Set(trip.bookings.map((b: { id: string }) => b.id)),
      stopIds: new Set(trip.stops.map((s: { id: string }) => s.id)),
    };
  }

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
        "The full current trip: days, stops (with ids), bookings, budget, spare ideas, plus recent activity — the travellers' own picks, ticks, time changes and expenses. Always call this before changing a trip, so you never overwrite their edits from a stale copy.",
      inputSchema: { trip_id: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ trip_id }) => {
      const { data, error } = await sb.from("trips").select(TRIP_SELECT).eq("id", trip_id).maybeSingle();
      if (error) return fail([error.message]);
      if (!data) return fail([`trip ${trip_id} not found (use list_trips)`]);
      return ok({ trip: rowsToTrip(data as TripRow), recent_activity: await activity(trip_id) });
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
      return ok({ trip_id: trip.id });
    },
  );

  server.registerTool(
    "update_trip",
    {
      title: "Update trip",
      description: "Change a trip's name, stage, dates, timezone, currency, people or summary. Extending dates adds days; shrinking is refused if a removed day has stops.",
      inputSchema: {
        trip_id: z.string().uuid(),
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
    async ({ trip_id, ...patch }) => {
      const ctx = await context(trip_id);
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
      return ok({ updated: Object.keys(patch) });
    },
  );

  server.registerTool(
    "upsert_days",
    {
      title: "Set days",
      description: `Set day titles (max 40 characters; detail goes in intro), city (matches spare ideas), place (shown under the date), intro and the rain plan (1–3 short sentences: what to swap if wet). Every day should have a rain plan.`,
      inputSchema: {
        trip_id: z.string().uuid(),
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
    async ({ trip_id, days }) => {
      const ctx = await context(trip_id);
      if (typeof ctx === "string") return fail([ctx]);
      const { rows, errors } = validateDays(days, ctx);
      if (errors.length) return fail(errors);
      const { error } = await sb.from("days").upsert(rows, { onConflict: "trip_id,date" });
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_days", { dates: days.map((d) => d.date) });
      return ok({ saved: rows.length });
    },
  );

  server.registerTool(
    "upsert_stops",
    {
      title: "Add or update stops",
      description:
        "Create or update stops in one batch (all or nothing). Pass id to update an existing stop (ids come from get_trip). Rules that make a plan work on the day: every stop has a time; mark fixed what cannot move; at least two optional stops per day; every hop over 5 minutes gets travel (go) with real journey times; the first stop's go is the trip from where you slept; ≥15 min slack before fixed times; every booked thing links its booking_id.",
      inputSchema: { trip_id: z.string().uuid(), stops: z.array(stopInput).min(1) },
    },
    async ({ trip_id, stops }) => {
      const ctx = await context(trip_id);
      if (typeof ctx === "string") return fail([ctx]);
      const { rows, errors } = validateStops(stops, ctx);
      if (errors.length) return fail(errors);
      const { error } = await sb.from("stops").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_stops", { stops: rows.map((r) => ({ id: r.id, name: r.name, time: r.time })) });
      return ok({ saved: rows.map((r) => ({ id: r.id, name: r.name })) });
    },
  );

  server.registerTool(
    "delete_stops",
    {
      title: "Delete stops",
      description: "Delete stops by id. Check recent activity first: a traveller may have ticked or picked one.",
      inputSchema: { trip_id: z.string().uuid(), stop_ids: z.array(z.string().uuid()).min(1) },
      annotations: { destructiveHint: true },
    },
    async ({ trip_id, stop_ids }) => {
      const { data, error } = await sb.from("stops").delete().eq("trip_id", trip_id).in("id", stop_ids).select("id, name");
      if (error) return fail([error.message]);
      await log(trip_id, "claude.delete_stops", { stops: data });
      return ok({ deleted: data?.length ?? 0 });
    },
  );

  server.registerTool(
    "upsert_bookings",
    {
      title: "Add or update bookings",
      description: "The to-book checklist. Pass id to update. status 'booked' only once it really is booked. private_ref holds booking references; it stays in the private database.",
      inputSchema: {
        trip_id: z.string().uuid(),
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
    async ({ trip_id, bookings }) => {
      const ctx = await context(trip_id);
      if (typeof ctx === "string") return fail([ctx]);
      const strangers = bookings.filter((b) => b.id && !ctx.bookingIds.has(b.id)).map((b) => `"${b.title}": booking ${b.id} is not in this trip; omit id to create`);
      if (strangers.length) return fail(strangers);
      const rows = bookings.map((b, i) => ({ ...b, id: b.id ?? crypto.randomUUID(), trip_id, sort: b.sort ?? i }));
      const { error } = await sb.from("bookings").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_bookings", { bookings: rows.map((r) => ({ id: r.id, title: r.title, status: r.status })) });
      return ok({ saved: rows.map((r) => ({ id: r.id, title: r.title })) });
    },
  );

  server.registerTool(
    "set_budget",
    {
      title: "Set budget",
      description: "Replace the trip's planned budget: one line per category, total for the whole party. Should cover every hotel night and every booking.",
      inputSchema: {
        trip_id: z.string().uuid(),
        lines: z.array(z.object({ category: z.string().min(1), label: z.string().min(1), planned: z.number().nonnegative() })),
      },
    },
    async ({ trip_id, lines }) => {
      const del = await sb.from("budget_lines").delete().eq("trip_id", trip_id);
      if (del.error) return fail([del.error.message]);
      const { error } = await sb.from("budget_lines").insert(lines.map((l) => ({ ...l, trip_id })));
      if (error) return fail([error.message]);
      await log(trip_id, "claude.set_budget", { lines });
      return ok({ saved: lines.length });
    },
  );

  server.registerTool(
    "upsert_spare_ideas",
    {
      title: "Add spare-time ideas",
      description: "Spare-time and rain ideas, tagged by city (must match the days' city), indoor or not, and minutes. Each city should have at least three indoor ideas.",
      inputSchema: {
        trip_id: z.string().uuid(),
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
    async ({ trip_id, ideas }) => {
      const rows = ideas.map((i) => ({ ...i, id: i.id ?? crypto.randomUUID(), trip_id }));
      const { error } = await sb.from("spare_ideas").upsert(rows);
      if (error) return fail([error.message]);
      await log(trip_id, "claude.upsert_spare_ideas", { names: ideas.map((i) => i.name) });
      return ok({ saved: rows.length });
    },
  );

  return server;
}
