import { describe, expect, it } from "vitest";
import { settle, spentByCategory, spentOn } from "./money";
import type { Expense, Member } from "./types";

const members: Member[] = [
  { userId: "k", name: "Kirill" },
  { userId: "t", name: "Tanya" },
];
const e = (id: string, amount: number, paidBy: string, category = "food", spentAt = "2026-12-21T12:00:00Z"): Expense => ({
  id, amount, currency: "EUR", category, paidBy, spentAt,
});

describe("spentByCategory", () => {
  it("adds up per category", () => {
    expect(spentByCategory([e("1", 10, "k"), e("2", 5.5, "t"), e("3", 20, "k", "stay")])).toEqual({ food: 15.5, stay: 20 });
  });
});

describe("settle", () => {
  it("splits evenly and says who owes whom, from my side", () => {
    const ex = [e("1", 60, "k"), e("2", 20, "t")]; // total 80, each 40: Kirill paid 60 → Tanya owes 20
    expect(settle(ex, members, "k")).toEqual({ with: "Tanya", owesMe: 20 });
    expect(settle(ex, members, "t")).toEqual({ with: "Kirill", owesMe: -20 });
  });

  it("is settled when even, and silent without a second person", () => {
    expect(settle([e("1", 10, "k"), e("2", 10, "t")], members, "k")).toEqual({ with: "Tanya", owesMe: 0 });
    expect(settle([e("1", 10, "k")], [members[0]], "k")).toBeUndefined();
  });
});

describe("spentOn", () => {
  it("counts the expenses of one local day", () => {
    const ex = [e("1", 10, "k", "food", "2026-12-21T22:30:00Z"), e("2", 4, "k", "food", "2026-12-21T23:30:00Z")];
    // 23:30 UTC on the 21st is already the 22nd in Munich.
    expect(spentOn(ex, "2026-12-21", "Europe/Berlin")).toBe(10);
    expect(spentOn(ex, "2026-12-22", "Europe/Berlin")).toBe(4);
  });
});
