"use client";

import { useSyncExternalStore } from "react";
import { createStore, get, set } from "idb-keyval";
import { applyOps, opToRpc, type Op, type StopDraft, type StopPatch } from "./ops";
import { rowsToTrip, TRIP_SELECT, type TripRow } from "./db";
import { hasSupabase } from "./supabase/env";
import { supabase } from "./supabase/client";
import type { Expense, Member, Note, Trip } from "./types";

/**
 * Local-first trip store. Screens read from the phone's copy (IndexedDB),
 * so every tap is instant and the plan works offline; the network only
 * refreshes snapshots and pushes queued edits in the background.
 *
 * Day 2 replaces `fetchSnapshots`/`pushOps` with Supabase; nothing else changes.
 */

type State = {
  loaded: boolean; // the phone's copy has been read
  online: boolean;
  syncedAt?: number; // last successful refresh from the server
  snapshots: Trip[];
  outbox: Op[]; // edits not yet confirmed by the server
  members: Member[]; // the household, for names and splitting expenses
  me?: string; // signed-in user id
};

const EMPTY: State = { loaded: false, online: true, snapshots: [], outbox: [], members: [] };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const idb = typeof indexedDB === "undefined" ? undefined : createStore("spor", "kv");

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function fetchSnapshots(): Promise<Trip[]> {
  if (hasSupabase) {
    const { data, error } = await supabase().from("trips").select(TRIP_SELECT).order("start_date");
    if (error) throw error;
    return (data as TripRow[]).map(rowsToTrip);
  }
  const res = await fetch("/api/trips", { cache: "no-store" });
  if (!res.ok) throw new Error(`trips: ${res.status}`);
  return res.json();
}

/**
 * Sends queued edits in order and returns the ids that are finished with: applied,
 * or refused by the server (a refusal won't change on retry, so it mustn't block the
 * queue). Stops at the first network failure; the rest go next time.
 */
async function pushOps(ops: Op[]): Promise<string[]> {
  if (!hasSupabase) return []; // seed mode: edits stay queued and applied on this phone
  const done: string[] = [];
  for (const op of ops) {
    const { error } = await supabase().rpc("apply_op", opToRpc(op));
    if (error && !error.code) break; // no answer from the server: offline or flaky
    if (error) console.warn("spor: edit refused and dropped", op, error.message);
    done.push(op.id);
  }
  return done;
}

async function fetchMembers(): Promise<Member[]> {
  if (!hasSupabase) return [];
  const { data, error } = await supabase().from("household_members").select("user_id, display_name");
  if (error) throw error;
  return data.map((m) => ({ userId: m.user_id, name: m.display_name }));
}

// The other phone's edits (and Claude's writes) arrive as change events; refetch shortly after.
function listenForChanges() {
  if (!hasSupabase) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(sync, 400);
  };
  const channel = supabase().channel("spor-trips");
  for (const table of ["trips", "days", "stops", "bookings", "expenses", "notes", "budget_lines", "spare_ideas"]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, later);
  }
  channel.subscribe();
}

// The phone's copy belongs to whoever is signed in: keys are prefixed with their user id.
let owner = "local";
const key = (k: string) => `${owner}:${k}`;

async function persist() {
  if (!idb) return;
  try {
    await Promise.all([
      set(key("snapshots"), state.snapshots, idb),
      set(key("outbox"), state.outbox, idb),
      set(key("members"), state.members, idb),
    ]);
  } catch {
    // Private mode or storage full: the session still works from memory.
  }
}

export async function sync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return setState({ online: false });
  try {
    const acked = new Set(await pushOps(state.outbox));
    const [snapshots, members] = await Promise.all([fetchSnapshots(), fetchMembers()]);
    setState({ snapshots, members, outbox: state.outbox.filter((o) => !acked.has(o.id)), online: true, syncedAt: Date.now() });
    await persist();
  } catch {
    setState({ online: false });
  }
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  (async () => {
    try {
      if (hasSupabase) {
        // Reads the session from cookies on the phone: works offline.
        const { data } = await supabase().auth.getSession();
        if (data.session) {
          owner = data.session.user.id;
          setState({ me: owner });
        }
      }
      if (idb) {
        const [snapshots, outbox, members] = await Promise.all([
          get<Trip[]>(key("snapshots"), idb),
          get<Op[]>(key("outbox"), idb),
          get<Member[]>(key("members"), idb),
        ]);
        setState({ snapshots: snapshots ?? [], outbox: outbox ?? [], members: members ?? [] });
      }
    } catch {
      // Unreadable storage: fall through to the network.
    }
    if (state.snapshots.length) setState({ loaded: true });
    await sync();
    setState({ loaded: true });
  })();
  listenForChanges();
  window.addEventListener("online", () => sync());
  window.addEventListener("offline", () => setState({ online: false }));
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && sync());
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

const useStore = () => useSyncExternalStore(subscribe, () => state, () => EMPTY);

// Derived trips are memoised per (snapshots, outbox) pair so React sees stable objects.
let derivedFor: { snapshots: Trip[]; outbox: Op[]; trips: Trip[] } | undefined;
function derive(s: State): Trip[] {
  if (derivedFor?.snapshots !== s.snapshots || derivedFor.outbox !== s.outbox) {
    derivedFor = { snapshots: s.snapshots, outbox: s.outbox, trips: s.snapshots.map((t) => applyOps(t, s.outbox)) };
  }
  return derivedFor.trips;
}

export function useTrips() {
  const s = useStore();
  return { trips: derive(s), loaded: s.loaded };
}

export function useTrip(id: string) {
  const s = useStore();
  return { trip: derive(s).find((t) => t.id === id), loaded: s.loaded };
}

export function useSyncStatus() {
  const s = useStore();
  return { online: s.online, pending: s.outbox.length, syncedAt: s.syncedAt };
}

/** The household and who is signed in: names for notes, and who pays for what. */
export function useHousehold() {
  const s = useStore();
  return { members: s.members, me: s.me };
}

// Every edit: queue it, show it at once, send it when there's signal.
type OpBody = Op extends infer T ? (T extends Op ? Omit<T, "id" | "tripId" | "at"> : never) : never;
function queue(tripId: string, body: OpBody) {
  const op = { ...body, id: crypto.randomUUID(), tripId, at: Date.now() } as Op;
  setState({ outbox: [...state.outbox, op] });
  void persist().then(sync);
}

export const editStop = (tripId: string, stopId: string, patch: StopPatch) =>
  queue(tripId, { kind: "stop.patch", stopId, patch });

export const saveStop = (tripId: string, stop: StopDraft) => queue(tripId, { kind: "stop.upsert", stop });

export const deleteStop = (tripId: string, stopId: string) => queue(tripId, { kind: "stop.delete", stopId });

export const addNote = (tripId: string, note: Pick<Note, "body" | "stopId" | "dayId">) =>
  queue(tripId, {
    kind: "note.add",
    note: { ...note, id: crypto.randomUUID(), authorId: state.me, createdAt: new Date().toISOString() },
  });

export const deleteNote = (tripId: string, noteId: string) => queue(tripId, { kind: "note.delete", noteId });

export const addExpense = (tripId: string, expense: Omit<Expense, "id" | "spentAt">) =>
  queue(tripId, { kind: "expense.add", expense: { ...expense, id: crypto.randomUUID(), spentAt: new Date().toISOString() } });

export const deleteExpense = (tripId: string, expenseId: string) =>
  queue(tripId, { kind: "expense.delete", expenseId });
