import { dayMinute } from "./ops";
import { nowIn, todayIn } from "./format";
import type { Stop, Trip } from "./types";

/** Before this hour, it still counts as the previous travel day (the nightcap belongs to yesterday). */
const DAY_STARTS_AT = 5;

export type Clock = { date: string; time: string; during: boolean };

/**
 * Today's travel date and time where the trip is. `preview` ("2026-12-22T13:10", from ?now=)
 * lets the Live view be checked at any moment of the trip.
 */
export function tripClock(trip: Pick<Trip, "timezone" | "startDate" | "endDate">, now = new Date(), preview?: string | null): Clock {
  let date: string;
  let time: string;
  const m = preview?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (m) {
    [, date, time] = m;
  } else {
    date = todayIn(trip.timezone, now);
    time = nowIn(trip.timezone, now);
    if (Number(time.slice(0, 2)) < DAY_STARTS_AT) {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      date = d.toISOString().slice(0, 10);
    }
  }
  return { date, time, during: date >= trip.startDate && date <= trip.endDate };
}

/** Minutes from `now` until `time`, both on the same travel day. */
export const minutesUntil = (time: string, now: string) => dayMinute(time) - dayMinute(now);

/** The Now/Next card: where you are, what's next, the next fixed time after that, and what's behind you. */
export function nowNext(stops: Stop[], now: string) {
  const t = dayMinute(now);
  const nextIndex = stops.findIndex((s) => dayMinute(s.time) > t);
  const cut = nextIndex === -1 ? stops.length : nextIndex;
  const current = cut > 0 ? stops[cut - 1] : undefined;
  const next = nextIndex === -1 ? undefined : stops[nextIndex];
  const nextFixed = next ? stops.slice(nextIndex + 1).find((s) => s.kind === "fixed") : undefined;
  return { current, next, nextFixed, earlier: stops.slice(0, Math.max(0, cut - 1)) };
}

/** How long the last stop of the day counts as "now" before the day is done (stops have no end time). */
export const LAST_STOP_MIN = 90;

/**
 * What the Today card leads with, one at a time: nothing planned, the next stop,
 * the last stop while you're at it, or done for today (after the last stop, or once it's ticked).
 */
export type DayStatus = "empty" | "next" | "last" | "done";
export function dayStatus(stops: Stop[], now: string): DayStatus {
  if (stops.length === 0) return "empty";
  const { current, next } = nowNext(stops, now);
  if (next) return "next";
  if (current && !current.doneAt && minutesUntil(now, current.time) < LAST_STOP_MIN) return "last";
  return "done";
}
