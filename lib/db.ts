import type { Booking, Day, Expense, Member, Note, Role, SpareIdea, Stop, Trip } from "./types";
import { dayMinute } from "./ops";

// Row shapes as Supabase returns them (snake_case, nulls, numerics as strings).
// Replace with generated types once the project exists.
type Num = number | string;

export type StopRow = {
  id: string; trip_id: string; day_id: string; time: string; approx: boolean; name: string;
  kind: Stop["kind"]; body: string | null; more?: string | null; lat: number | null; lng: number | null;
  maps_query: string | null; go: Stop["go"] | null; journey: Stop["journey"] | null; off_map: boolean;
  who: string | null; fee: Stop["fee"] | null; booking_id: string | null; options: NonNullable<Stop["options"]>;
  pick_one: boolean; picked_option_id: string | null; done_at: string | null; sort: number;
};
export type DayRow = {
  id: string; trip_id: string; date: string; title: string; city: string; place: string;
  intro: string | null; rain: string[];
};
export type BookingRow = {
  id: string; trip_id: string; title: string; note: string | null; status: Booking["status"];
  est_cost: Num | null; sort: number;
};
export type BudgetRow = { id: string; trip_id: string; category: string; label: string; planned: Num };
export type SpareRow = {
  id: string; trip_id: string; name: string; city: string; area: string | null; note: string | null;
  indoor: boolean; minutes: number; lat: number | null; lng: number | null; maps_query: string | null;
};
export type NoteRow = {
  id: string; trip_id: string; stop_id: string | null; day_id: string | null; author: string | null;
  body: string; created_at: string; via?: "claude" | null;
};
export type ExpenseRow = {
  id: string; trip_id: string; amount: Num; currency: Trip["currency"]; category: string; paid_by: string | null;
  stop_id: string | null; note: string | null; spent_at: string;
};
export type MemberRow = { user_id: string; role: Role; profiles?: { display_name: string } | null };
export type TripRow = {
  id: string; owner_id?: string; trip_members?: MemberRow[]; name: string; stage: Trip["stage"]; start_date: string | null;
  end_date: string | null; timezone: string; currency: Trip["currency"]; people: string[]; summary: string | null;
  revision?: number;
  days: DayRow[]; stops: StopRow[]; bookings: BookingRow[]; budget_lines: BudgetRow[]; spare_ideas: SpareRow[];
  notes?: NoteRow[]; expenses?: ExpenseRow[];
};

/** PostgREST select that returns one TripRow per trip. */
export const TRIP_SELECT =
  "*, days(*), stops(*), bookings(*), budget_lines(*), spare_ideas(*), notes(*), expenses(*), trip_members(user_id, role, profiles(display_name))";

const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1, viewer: 2 };
const opt = <T>(v: T | null | undefined) => (v == null ? undefined : v);
// Drops undefined only; optional flags opt out with `|| undefined` at the call site.
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function toStop(r: StopRow): Stop {
  return clean({
    id: r.id,
    time: r.time,
    approx: r.approx || undefined,
    name: r.name,
    kind: r.kind,
    body: opt(r.body),
    more: opt(r.more),
    lat: opt(r.lat),
    lng: opt(r.lng),
    mapsQuery: opt(r.maps_query),
    go: opt(r.go),
    journey: opt(r.journey),
    offMap: r.off_map || undefined,
    who: opt(r.who),
    fee: opt(r.fee),
    bookingId: opt(r.booking_id),
    options: r.options.length ? r.options : undefined,
    pickOne: r.pick_one || undefined,
    pickedOptionId: opt(r.picked_option_id),
    doneAt: opt(r.done_at),
  });
}

export function rowsToTrip(r: TripRow): Trip {
  const byDay = new Map<string, StopRow[]>();
  for (const s of r.stops) byDay.set(s.day_id, [...(byDay.get(s.day_id) ?? []), s]);

  const days: Day[] = [...r.days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) =>
      clean({
        id: d.id,
        date: d.date,
        title: d.title,
        city: d.city,
        place: d.place,
        intro: opt(d.intro),
        rain: d.rain,
        stops: (byDay.get(d.id) ?? [])
          .sort((a, b) => dayMinute(a.time) - dayMinute(b.time) || a.sort - b.sort)
          .map(toStop),
      }),
    );

  return clean({
    id: r.id,
    revision: r.revision,
    name: r.name,
    stage: r.stage,
    startDate: r.start_date ?? "",
    endDate: r.end_date ?? "",
    timezone: r.timezone,
    currency: r.currency,
    people: r.people,
    summary: opt(r.summary),
    ownerId: opt(r.owner_id),
    members: r.trip_members
      ? [...r.trip_members]
          .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
          .map((m): Member => ({ userId: m.user_id, name: m.profiles?.display_name ?? "", role: m.role }))
      : undefined,
    days,
    bookings: [...r.bookings]
      .sort((a, b) => a.sort - b.sort)
      .map((b) => clean({ id: b.id, title: b.title, note: opt(b.note), status: b.status, estCost: b.est_cost == null ? undefined : Number(b.est_cost) })),
    budget: r.budget_lines.map((b) => ({ category: b.category, label: b.label, planned: Number(b.planned) })),
    spare: r.spare_ideas.map(
      (s): SpareIdea =>
        clean({
          id: s.id, name: s.name, city: s.city, area: opt(s.area), note: opt(s.note), indoor: s.indoor,
          minutes: s.minutes, lat: opt(s.lat), lng: opt(s.lng), mapsQuery: opt(s.maps_query),
        }),
    ),
    notes: r.notes
      ? [...r.notes]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(
            (n): Note =>
              clean({
                id: n.id, body: n.body, authorId: opt(n.author), via: opt(n.via), stopId: opt(n.stop_id),
                dayId: opt(n.day_id), createdAt: n.created_at,
              }),
          )
      : undefined,
    expenses: r.expenses?.map(
      (e): Expense =>
        clean({
          id: e.id, amount: Number(e.amount), currency: e.currency, category: e.category, paidBy: opt(e.paid_by),
          stopId: opt(e.stop_id), note: opt(e.note), spentAt: e.spent_at,
        }),
    ),
  });
}
