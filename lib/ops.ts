import type { Expense, Note, Stop, Trip } from "./types";

/**
 * A hand edit made on a phone. Edits are queued and applied on top of the
 * last trip snapshot, so the screen updates at once and works offline; the
 * queue is pushed to the server (public.apply_op) when there is signal.
 */
export type StopPatch = Partial<Pick<Stop, "time" | "pickedOptionId" | "doneAt">>;

/** What the in-app stop form can set; everything else on a stop stays Claude's. */
export type StopDraft = {
  id: string; dayId: string; time: string; name: string; kind: Stop["kind"]; body?: string; more?: string;
  // Where it is: set or cleared (null) from the form; left out, the stop keeps its place.
  lat?: number | null; lng?: number | null;
};

type OpBase = { id: string; tripId: string; at: number }; // at: ms since epoch, for ordering

export type Op = OpBase &
  (
    | { kind: "stop.patch"; stopId: string; patch: StopPatch }
    | { kind: "stop.upsert"; stop: StopDraft }
    | { kind: "stop.delete"; stopId: string }
    | { kind: "note.add"; note: Note }
    | { kind: "note.delete"; noteId: string }
    | { kind: "expense.add"; expense: Expense }
    | { kind: "expense.delete"; expenseId: string }
  );

// Edits queued before kinds existed were all stop patches.
const kindOf = (o: Op) => o.kind ?? "stop.patch";

export function applyOps(trip: Trip, ops: Op[]): Trip {
  const mine = ops.filter((o) => o.tripId === trip.id).sort((a, b) => a.at - b.at);
  if (mine.length === 0) return trip;

  let days = trip.days.map((d) => ({ ...d, stops: [...d.stops] }));
  let notes = [...(trip.notes ?? [])];
  let expenses = [...(trip.expenses ?? [])];
  const touched = new Set<string>();
  const findStop = (id: string) => {
    for (const d of days) {
      const i = d.stops.findIndex((s) => s.id === id);
      if (i >= 0) return { day: d, i };
    }
    return undefined;
  };

  for (const o of mine) {
    switch (kindOf(o)) {
      case "stop.patch": {
        const { stopId, patch } = o as Extract<Op, { kind: "stop.patch" }>;
        const at = findStop(stopId);
        if (!at) break; // stop deleted since (e.g. Claude rewrote the day): drop the edit
        at.day.stops[at.i] = { ...at.day.stops[at.i], ...patch };
        touched.add(at.day.id);
        break;
      }
      case "stop.upsert": {
        const { stop } = o as Extract<Op, { kind: "stop.upsert" }>;
        const target = days.find((d) => d.id === stop.dayId);
        if (!target) break;
        const at = findStop(stop.id);
        const previous = at ? at.day.stops[at.i] : undefined;
        if (at) at.day.stops.splice(at.i, 1);
        const { dayId: _dayId, lat, lng, ...fields } = stop;
        void _dayId;
        const place = "lat" in stop ? { lat: lat ?? undefined, lng: lng ?? undefined } : {};
        target.stops.push({ ...previous, ...fields, ...place });
        touched.add(target.id);
        break;
      }
      case "stop.delete": {
        const { stopId } = o as Extract<Op, { kind: "stop.delete" }>;
        days = days.map((d) => ({ ...d, stops: d.stops.filter((s) => s.id !== stopId) }));
        break;
      }
      case "note.add": {
        const { note } = o as Extract<Op, { kind: "note.add" }>;
        if (!notes.some((n) => n.id === note.id)) notes.push(note);
        break;
      }
      case "note.delete": {
        const { noteId } = o as Extract<Op, { kind: "note.delete" }>;
        notes = notes.filter((n) => n.id !== noteId);
        break;
      }
      case "expense.add": {
        const { expense } = o as Extract<Op, { kind: "expense.add" }>;
        if (!expenses.some((e) => e.id === expense.id)) expenses.push(expense);
        break;
      }
      case "expense.delete": {
        const { expenseId } = o as Extract<Op, { kind: "expense.delete" }>;
        expenses = expenses.filter((e) => e.id !== expenseId);
        break;
      }
    }
  }

  days = days.map((d) => (touched.has(d.id) ? { ...d, stops: sortStops(d.stops) } : d));
  return { ...trip, days, notes, expenses };
}

// Stable sort: equal times keep the plan's order.
function sortStops(stops: Stop[]): Stop[] {
  return stops
    .map((s, i) => [s, i] as const)
    .sort(([a, i], [b, j]) => dayMinute(a.time) - dayMinute(b.time) || i - j)
    .map(([s]) => s);
}

/** Minutes into the travel day; 00:00–04:59 belongs to the night before. */
export const dayMinute = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h < 5 ? h + 24 : h) * 60 + m;
};

/** Arguments for public.apply_op: one queued edit, idempotent on its id. */
export function opToRpc(o: Op) {
  const call = (target: string, payload: object) => ({
    p_op_id: o.id,
    p_trip_id: o.tripId,
    p_kind: kindOf(o),
    p_target: target,
    p_payload: payload,
  });
  switch (kindOf(o)) {
    case "stop.patch": {
      const { stopId, patch } = o as Extract<Op, { kind: "stop.patch" }>;
      return call(stopId, patch);
    }
    case "stop.upsert": {
      const { id, ...rest } = (o as Extract<Op, { kind: "stop.upsert" }>).stop;
      return call(id, rest);
    }
    case "stop.delete":
      return call((o as Extract<Op, { kind: "stop.delete" }>).stopId, {});
    case "note.add": {
      const { id, body, stopId, dayId } = (o as Extract<Op, { kind: "note.add" }>).note;
      return call(id, { body, stopId, dayId });
    }
    case "note.delete":
      return call((o as Extract<Op, { kind: "note.delete" }>).noteId, {});
    case "expense.add": {
      const { id, ...rest } = (o as Extract<Op, { kind: "expense.add" }>).expense;
      return call(id, rest);
    }
    case "expense.delete":
      return call((o as Extract<Op, { kind: "expense.delete" }>).expenseId, {});
  }
}
