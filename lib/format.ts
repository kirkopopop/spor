import type { Day, Stop, Trip } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** "21–25 Dec", "30 Dec – 2 Jan" */
export function dateRange(start: string, end: string): string {
  const a = parse(start);
  const b = parse(end);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  }
  return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/** "Nov 2026" */
export const monthYear = (iso: string) => {
  const d = parse(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** "Mon 21" */
export const dayTab = (iso: string) => {
  const d = parse(iso);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
};

/** Today's date (YYYY-MM-DD) where the trip is, whatever the phone's clock zone. */
export const todayIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** "HH:MM" now, where the trip is. */
export const nowIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);

export function daysUntil(iso: string, timeZone: string, now = new Date()): number {
  return Math.round((parse(iso).getTime() - parse(todayIn(timeZone, now)).getTime()) / 86_400_000);
}

const SYMBOL: Record<Trip["currency"], string> = { EUR: "€", GBP: "£", DKK: "kr ", USD: "$" };

/** "€1,450" for round amounts, "€12.50" when there are cents. */
export const money = (n: number, cur: Trip["currency"]) => {
  const cents = Math.round(n * 100) % 100 !== 0;
  return `${SYMBOL[cur]}${n.toLocaleString("en-GB", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
};

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (n: number) => {
  const v = ((n % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export const shiftTime = (t: string, delta: number) => fromMin(toMin(t) + delta);

// The signed-in person's clock preference (Settings → Preferences); the store sets it.
let clock: "24h" | "12h" = "24h";
export const setClockFormat = (f: "24h" | "12h") => {
  clock = f;
};

/** "18:30" or "6:30 pm", per the person's preference. Stored times are always HH:MM. */
export function clockTime(t: string): string {
  if (clock === "24h") return t;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const showTime = (s: Pick<Stop, "time" | "approx">) => (s.approx ? "~" : "") + clockTime(s.time);

/** Slack kept before every fixed time (handover: ≥15 min before each fixed stop). */
export const LEAVE_SLACK_MIN = 15;

/** Leave-by: the plan's own `go.leave`, else time − travel, minus slack when the stop is fixed. */
export function leaveBy(stop: Stop): string | undefined {
  if (!stop.go) return undefined;
  if (stop.go.leave) return stop.go.leave;
  const slack = stop.kind === "fixed" ? LEAVE_SLACK_MIN : 0;
  return fromMin(toMin(stop.time) - stop.go.min - slack);
}

export const MODE_LABEL: Record<string, string> = {
  walk: "Walk",
  tube: "Tube",
  train: "Train",
  bus: "Bus",
  taxi: "Taxi",
  bike: "Bike",
  plane: "Flight",
  car: "Drive",
};

export function travelMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Google Maps directions through every mapped stop of the day, in order. */
export function dayRouteUrl(day: Day): string | undefined {
  const pts = day.stops.filter((s) => s.lat != null && s.lng != null && !s.offMap);
  if (pts.length === 0) return undefined;
  return "https://www.google.com/maps/dir/" + pts.map((s) => `${s.lat},${s.lng}`).join("/");
}

export const mapsSearch = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export function toBookCount(trip: Trip) {
  return trip.bookings.filter((b) => b.status === "to_book").length;
}

export function openPicks(trip: Trip) {
  return trip.days.flatMap((d) => d.stops).filter((s) => s.pickOne && !s.pickedOptionId).length;
}

export const plannedTotal = (trip: Trip) => trip.budget.reduce((n, b) => n + b.planned, 0);
