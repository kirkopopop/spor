"use client";

import { useSyncExternalStore } from "react";
import { createStore, get, set } from "idb-keyval";
import { hasSupabase } from "./supabase/env";
import { supabase } from "./supabase/client";
import type { Airport, Flight } from "./flights";

// Flights, logged by hand or by someone's Claude: read and changed by the whole household (one
// booking covers both). Kept on the device so stats show offline; like places, changing them
// needs a connection and says so.

type Row = {
  id: string;
  user_id: string;
  flown_on: string;
  from_code: string;
  to_code: string;
  from_country: string;
  to_country: string;
  km: number;
  minutes: number | null;
};
type State = { loaded: boolean; flights: Flight[] };
export type FlightInput = Omit<Flight, "id">;

const idb = typeof indexedDB === "undefined" ? undefined : createStore("spor-flights", "rows");
const DEV_KEY = "spor-flights-dev"; // local prototype without Supabase
const SELECT = "id, user_id, flown_on, from_code, to_code, from_country, to_country, km, minutes";

let state: State = { loaded: false, flights: [] };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
  if (idb && hasSupabase) void set("rows", state.flights, idb).catch(() => {});
};
const fromRow = (r: Row): Flight => ({
  id: r.id,
  userId: r.user_id,
  date: r.flown_on,
  from: r.from_code,
  to: r.to_code,
  fromCountry: r.from_country,
  toCountry: r.to_country,
  km: r.km,
  minutes: r.minutes ?? undefined,
});
const toRow = (f: FlightInput) => ({
  user_id: f.userId,
  flown_on: f.date,
  from_code: f.from,
  to_code: f.to,
  from_country: f.fromCountry,
  to_country: f.toCountry,
  km: f.km,
  minutes: f.minutes ?? null,
});

const dev = {
  read: (): Flight[] => {
    try {
      return JSON.parse(localStorage.getItem(DEV_KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  write: (flights: Flight[]) => {
    try {
      localStorage.setItem(DEV_KEY, JSON.stringify(flights));
    } catch {
      // Private mode: kept for this visit only.
    }
  },
};

let started = false;
async function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!hasSupabase) return emit({ loaded: true, flights: dev.read() });
  const cached = idb ? await get<Flight[]>("rows", idb).catch(() => undefined) : undefined;
  if (cached) emit({ loaded: true, flights: cached });
  const { data, error } = await supabase().from("flights").select(SELECT).order("flown_on");
  if (!error && data) emit({ flights: (data as Row[]).map(fromRow) });
  emit({ loaded: true });
}

export function useFlights() {
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

const failed = (what: string) => new Error(navigator.onLine ? `Couldn't ${what}. Try again.` : "Flights need a connection to change.");

/** Logs one flight for each person given. Shows at once; rolled back if the server says no. */
export async function addFlights(input: FlightInput[]) {
  const temps = input.map((f) => ({ ...f, id: `local-${crypto.randomUUID()}` }));
  const before = state.flights;
  emit({ flights: [...before, ...temps] });
  if (!hasSupabase) return dev.write(state.flights);
  const { data, error } = await supabase().from("flights").insert(input.map(toRow)).select(SELECT);
  if (error) {
    emit({ flights: before });
    throw failed("save that flight");
  }
  emit({ flights: [...before, ...(data as Row[]).map(fromRow)] });
}

export async function updateFlight(id: string, f: FlightInput) {
  const before = state.flights;
  emit({ flights: before.map((x) => (x.id === id ? { ...f, id } : x)) });
  if (!hasSupabase) return dev.write(state.flights);
  const { error } = await supabase().from("flights").update(toRow(f)).eq("id", id);
  if (error) {
    emit({ flights: before });
    throw failed("save that flight");
  }
}

export async function removeFlight(id: string) {
  const before = state.flights;
  emit({ flights: before.filter((x) => x.id !== id) });
  if (!hasSupabase) return dev.write(state.flights);
  const { error } = await supabase().from("flights").delete().eq("id", id);
  if (error) {
    emit({ flights: before });
    throw failed("remove that flight");
  }
}

let airports: Promise<Airport[]> | undefined;
/** Every airport with scheduled flights (~270 KB), fetched the first time a flight is shown or typed. */
export const loadAirports = () => (airports ??= import("@/assets/geo/airports.json").then((m) => m.default as unknown as Airport[]));
