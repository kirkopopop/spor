import { describe, expect, it } from "vitest";
import { dayStatus, minutesUntil, nowNext, tripClock } from "./live";
import type { Stop, Trip } from "./types";

const s = (id: string, time: string, kind: Stop["kind"] = "normal"): Stop => ({ id, time, name: id, kind });
const day = [s("breakfast", "08:30"), s("museum", "10:00"), s("lunch", "12:30", "fixed"), s("nap", "14:30", "fixed"), s("dinner", "18:00")];

describe("nowNext", () => {
  it("finds the current stop, the next one and the next fixed time after it", () => {
    const r = nowNext(day, "11:15");
    expect(r.current?.id).toBe("museum");
    expect(r.next?.id).toBe("lunch");
    expect(r.nextFixed?.id).toBe("nap");
    expect(r.earlier.map((x) => x.id)).toEqual(["breakfast"]);
  });

  it("before the first stop there is no current stop", () => {
    const r = nowNext(day, "07:00");
    expect(r.current).toBeUndefined();
    expect(r.next?.id).toBe("breakfast");
    expect(r.earlier).toEqual([]);
  });

  it("after the last stop the day is over", () => {
    const r = nowNext(day, "21:00");
    expect(r.current?.id).toBe("dinner");
    expect(r.next).toBeUndefined();
  });

  it("treats after-midnight stops as the same travel day", () => {
    const late = [...day, s("nightcap", "00:30")];
    expect(nowNext(late, "23:50").next?.id).toBe("nightcap");
    expect(nowNext(late, "00:45").current?.id).toBe("nightcap");
  });
});

describe("minutesUntil", () => {
  it("counts minutes on the travel day, across midnight", () => {
    expect(minutesUntil("12:30", "11:15")).toBe(75);
    expect(minutesUntil("00:30", "23:50")).toBe(40);
  });
});

describe("tripClock", () => {
  const trip = { timezone: "Europe/Berlin", startDate: "2026-12-21", endDate: "2026-12-25" } as Trip;

  it("reads the date and time where the trip is", () => {
    expect(tripClock(trip, new Date("2026-12-22T10:05:00Z"))).toEqual({ date: "2026-12-22", time: "11:05", during: true });
    expect(tripClock(trip, new Date("2026-12-26T10:05:00Z")).during).toBe(false);
  });

  it("before 05:00 it is still the previous travel day", () => {
    expect(tripClock(trip, new Date("2026-12-22T00:30:00Z"))).toMatchObject({ date: "2026-12-21", time: "01:30" });
  });

  it("accepts a ?now= preview like 2026-12-22T13:10", () => {
    expect(tripClock(trip, new Date(), "2026-12-22T13:10")).toEqual({ date: "2026-12-22", time: "13:10", during: true });
  });
});

describe("dayStatus", () => {
  it("an empty day is empty, never done", () => {
    expect(dayStatus([], "09:00")).toBe("empty");
    expect(dayStatus([], "23:00")).toBe("empty");
  });
  it("is next while a stop is ahead", () => {
    expect(dayStatus(day, "07:00")).toBe("next");
    expect(dayStatus(day, "17:59")).toBe("next");
  });
  it("is the last stop for a while after it starts, then done", () => {
    expect(dayStatus(day, "18:00")).toBe("last");
    expect(dayStatus(day, "19:29")).toBe("last");
    expect(dayStatus(day, "19:30")).toBe("done");
  });
  it("is done as soon as the last stop is ticked", () => {
    const ticked = [...day.slice(0, -1), { ...day.at(-1)!, doneAt: "2026-12-22T18:40:00Z" }];
    expect(dayStatus(ticked, "18:45")).toBe("done");
  });
});
