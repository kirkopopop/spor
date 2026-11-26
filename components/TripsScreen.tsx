"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip, usePrefs, useTrips } from "@/lib/store";
import { todayIn } from "@/lib/format";
import { groupTrips } from "@/lib/tripView";
import type { Trip } from "@/lib/types";
import { Screen } from "./shell/TabBar";
import { TripGroup } from "./HomeScreen";
import { Sheet } from "./Sheet";
import { Plus } from "./icons";
import { field, primaryButton } from "./Forms";

export function TripsScreen() {
  const { trips, loaded } = useTrips();
  const [adding, setAdding] = useState(false);
  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;
  const g = groupTrips(trips, todayIn("Europe/Copenhagen"));

  return (
    <Screen
      title="Trips"
      action={
        <button
          onClick={() => setAdding(true)}
          aria-label="New trip"
          className="press mb-1.5 flex size-9 items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-float)]"
        >
          <Plus size={20} />
        </button>
      }
    >
      {trips.length === 0 && <p className="px-1 text-[15px] text-muted">None yet.</p>}
      {g.now.length > 0 && <TripGroup title="Now" trips={g.now} />}
      {g.upcoming.length > 0 && <TripGroup title="Upcoming" trips={g.upcoming} />}
      {g.ideas.length > 0 && <TripGroup title="Ideas" trips={g.ideas} />}
      {g.past.length > 0 && <TripGroup title="Past" trips={g.past} />}
      <Sheet open={adding} onClose={() => setAdding(false)} label="New trip">
        <NewTripForm onDone={() => window.history.back()} />
      </Sheet>
    </Screen>
  );
}

function NewTripForm({ onDone }: { onDone: () => void }) {
  const prefs = usePrefs();
  const router = useRouter();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [currency, setCurrency] = useState<Trip["currency"]>(prefs.homeCurrency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const datesOk = (!start && !end) || (start && end && end >= start);
  const valid = name.trim().length > 0 && datesOk;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(undefined);
    try {
      const id = await createTrip({ name: name.trim(), startDate: start || undefined, endDate: end || undefined, currency });
      onDone();
      router.push(`/trips/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the trip. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 pr-10">
      <h3 className="text-[22px] font-bold tracking-[-0.02em]">New trip</h3>
      <label>
        <span className="sr-only">Name</span>
        <input autoFocus required placeholder="Where to?" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[13px] text-muted">
          From
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-[13px] text-muted">
          To
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <label className="text-[13px] text-muted">
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Trip["currency"])} className={`${field} mt-1`}>
          {(["EUR", "DKK", "GBP", "USD"] as const).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {!datesOk && <p className="text-[14px] text-danger">Add both dates, or neither for an idea.</p>}
      {error && <p className="text-[14px] text-danger">{error}</p>}
      <button type="submit" disabled={!valid || busy} className={primaryButton}>
        {busy ? "Creating…" : start ? "Create trip" : "Save as idea"}
      </button>
    </form>
  );
}
