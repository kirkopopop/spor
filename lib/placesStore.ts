"use client";

import { useSyncExternalStore } from "react";
import { createStore, get, set } from "idb-keyval";
import { hasSupabase } from "./supabase/env";
import { supabase } from "./supabase/client";
import type { Place } from "./places";

// Places been, logged by hand: read for the whole household (Me / Tanya / Both), changed only by
// their owner (the database enforces both). Kept on the device so the globe shows them offline.
// Unlike trips there's no outbox: logging a place needs a connection, and says so.

type Row = { id: string; user_id: string; kind: "country" | "city"; country: string; name: string; lat: number | null; lng: number | null };
type State = { loaded: boolean; rows: Place[] };

const idb = typeof indexedDB === "undefined" ? undefined : createStore("spor-places", "rows");
const DEV_KEY = "spor-places-dev"; // local prototype without Supabase
const SELECT = "id, user_id, kind, country, name, lat, lng";

let state: State = { loaded: false, rows: [] };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  if (idb && hasSupabase) void set("rows", state.rows, idb).catch(() => {});
};
const fromRow = (r: Row): Place => ({ id: r.id, userId: r.user_id, kind: r.kind, country: r.country, name: r.name, lat: r.lat ?? undefined, lng: r.lng ?? undefined });

const dev = {
  read: (): Place[] => {
    try {
      return JSON.parse(localStorage.getItem(DEV_KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  write: (rows: Place[]) => {
    try {
      localStorage.setItem(DEV_KEY, JSON.stringify(rows));
    } catch {
      // Private mode: kept for this visit only.
    }
  },
};

let started = false;
async function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!hasSupabase) return emit({ loaded: true, rows: dev.read() });
  const cached = idb ? await get<Place[]>("rows", idb).catch(() => undefined) : undefined;
  if (cached) emit({ loaded: true, rows: cached });
  await refresh();
  emit({ loaded: true });
}

async function refresh() {
  const { data, error } = await supabase().from("places_been").select(SELECT).order("created_at");
  if (!error && data) emit({ rows: (data as Row[]).map(fromRow) });
}

export function usePlaces() {
  return useSyncExternalStore(
    (l) => {
      void start();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Logs a place for the signed-in person. Shows at once; rolled back if the server says no. */
export async function addPlace(p: Omit<Place, "id" | "userId" | "fromTrip">, me?: string): Promise<Place> {
  const temp: Place = { ...p, id: `local-${crypto.randomUUID()}`, userId: me };
  const before = state.rows;
  emit({ rows: [...before, temp] });
  if (!hasSupabase) {
    dev.write(state.rows);
    return temp;
  }
  const { data, error } = await supabase()
    .from("places_been")
    .insert({ kind: p.kind, country: p.country, name: p.name, lat: p.lat ?? null, lng: p.lng ?? null })
    .select(SELECT)
    .single();
  if (error) {
    emit({ rows: before });
    if (error.code === "23505") {
      await refresh(); // already logged (another device): take the server's copy
      return state.rows.find((r) => r.kind === p.kind && r.country === p.country && r.name === p.name) ?? temp;
    }
    throw new Error(navigator.onLine ? "Couldn't save that place. Try again." : "Logging a place needs a connection.");
  }
  const saved = fromRow(data as Row);
  emit({ rows: state.rows.map((r) => (r.id === temp.id ? saved : r)) });
  return saved;
}

/** Removes some of the signed-in person's logged places (the database refuses anyone else's). */
export async function removePlaces(ids: string[]) {
  const before = state.rows;
  emit({ rows: before.filter((r) => !r.id || !ids.includes(r.id)) });
  if (!hasSupabase) return dev.write(state.rows);
  const { error } = await supabase().from("places_been").delete().in("id", ids);
  if (error) {
    emit({ rows: before });
    throw new Error(navigator.onLine ? "Couldn't remove that place. Try again." : "Removing a place needs a connection.");
  }
}
