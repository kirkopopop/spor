import { describe, expect, it } from "vitest";
import { seedSql } from "./seedSql";
import type { Trip } from "./types";

const trip: Trip = {
  id: "uktrip",
  name: "Kirill's trip",
  stage: "memory",
  startDate: "2026-11-19",
  endDate: "2026-11-19",
  timezone: "Europe/London",
  currency: "GBP",
  people: ["Kirill"],
  days: [
    {
      id: "thu",
      date: "2026-11-19",
      title: "Day",
      city: "london",
      place: "London",
      rain: ["It's wet"],
      stops: [
        { id: "11111111-1111-4111-8111-111111111111", time: "19:30", name: "Dinner", kind: "fixed", bookingId: "tatar", go: { mode: "walk", min: 5 } },
      ],
    },
  ],
  bookings: [{ id: "tatar", title: "Tatar Bunar", status: "booked" }],
  budget: [],
  spare: [],
};

describe("seedSql", () => {
  const sql = seedSql([trip], { ownerEmail: "Me@Example.com" });

  it("escapes quotes", () => {
    expect(sql).toContain("'Kirill''s trip'");
    expect(sql).toContain("'It''s wet'");
  });

  it("gives non-uuid ids new uuids and remaps the stop's booking", () => {
    expect(sql).not.toMatch(/'uktrip'|'thu'|'tatar'/);
    const bookingId = sql.match(/insert into public\.bookings[^;]*?values \('([0-9a-f-]{36})'/)?.[1];
    expect(bookingId).toBeDefined();
    expect(sql).toMatch(new RegExp(`'11111111-1111-4111-8111-111111111111'[^;]*'${bookingId}'`));
  });

  it("writes a stop without options as an empty JSON list, and empty text arrays as {}", () => {
    expect(sql).toMatch(/'\[\]'::jsonb, false, 0\);/);
    expect(sql).not.toContain("array[]::text[]");
    const munich = seedSql([{ ...trip, days: [{ ...trip.days[0], rain: [] }] }], { ownerEmail: "a@b.co" });
    expect(munich).toContain("'{}'::text[]");
  });

  it("gives the trips to the account with that email, lowercased, in one transaction", () => {
    expect(sql).toContain("insert into public.trips (id, owner_id, name");
    expect(sql).toMatch(/\(select id from auth\.users where lower\(email\) = 'me@example\.com'\)/);
    expect(sql.trim().startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
  });
});
