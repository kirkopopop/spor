import { todayIn } from "./format";
import type { Expense, Member } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function spentByCategory(expenses: Expense[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) out[e.category] = round2((out[e.category] ?? 0) + e.amount);
  return out;
}

/**
 * Even split across the people on the trip. With two people: who I settle with and how much
 * they owe me (negative: I owe them). Undefined when there is nobody to split with.
 */
export function settle(expenses: Expense[], members: Member[], me: string | undefined) {
  if (!me || members.length < 2) return undefined;
  const other = members.find((m) => m.userId !== me);
  if (!other) return undefined;
  const total = expenses.reduce((n, e) => n + e.amount, 0);
  const mine = expenses.filter((e) => e.paidBy === me).reduce((n, e) => n + e.amount, 0);
  return { with: other.name, owesMe: round2(mine - total / members.length) };
}

/** Spent on one local travel date in the trip's timezone. */
export function spentOn(expenses: Expense[], date: string, timeZone: string) {
  return round2(expenses.filter((e) => todayIn(timeZone, new Date(e.spentAt)) === date).reduce((n, e) => n + e.amount, 0));
}
