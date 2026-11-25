"use client";

import { useSyncExternalStore } from "react";
import { createStore, get, set } from "idb-keyval";
import { applyOps, type Op, type StopPatch } from "./ops";
import type { Trip } from "./types";

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
};

const EMPTY: State = { loaded: false, online: true, snapshots: [], outbox: [] };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const idb = typeof indexedDB === "undefined" ? undefined : createStore("spor", "kv");

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function fetchSnapshots(): Promise<Trip[]> {
  const res = await fetch("/api/trips", { cache: "no-store" });
  if (!res.ok) throw new Error(`trips: ${res.status}`);
  return res.json();
}

// No server write path yet: edits stay queued (and applied) on this phone.
async function pushOps(ops: Op[]): Promise<string[]> {
  void ops;
  return [];
}

async function persist() {
  if (!idb) return;
  try {
    await Promise.all([set("snapshots", state.snapshots, idb), set("outbox", state.outbox, idb)]);
  } catch {
    // Private mode or storage full: the session still works from memory.
  }
}

export async function sync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return setState({ online: false });
  try {
    const acked = new Set(await pushOps(state.outbox));
    const snapshots = await fetchSnapshots();
    setState({ snapshots, outbox: state.outbox.filter((o) => !acked.has(o.id)), online: true, syncedAt: Date.now() });
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
      if (idb) {
        const [snapshots, outbox] = await Promise.all([get<Trip[]>("snapshots", idb), get<Op[]>("outbox", idb)]);
        setState({ snapshots: snapshots ?? [], outbox: outbox ?? [] });
      }
    } catch {
      // Unreadable storage: fall through to the network.
    }
    if (state.snapshots.length) setState({ loaded: true });
    await sync();
    setState({ loaded: true });
  })();
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

export function editStop(tripId: string, stopId: string, patch: StopPatch) {
  const op: Op = { id: crypto.randomUUID(), tripId, at: Date.now(), stopId, patch };
  setState({ outbox: [...state.outbox, op] });
  void persist().then(sync);
}
