"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Trip } from "@/lib/types";
import { dateRange, daysUntil } from "@/lib/format";
import { destinationOf, tripPlace } from "@/lib/destination";
import { tripRoutes } from "@/lib/tripView";
import { Globe, type GlobePin } from "./map/Globe";
import { TripTile } from "./Destination";
import { Chevron } from "./icons";

type Filter = "all" | "planned" | "done";
const LABEL: Record<Filter, string> = { all: "All", planned: "Planned", done: "Done" };

/**
 * The household's world: every trip with a place, on a globe you can turn. Filter to what's
 * planned or done; tap a pin for the trip, and from there into it.
 */
export function OverviewGlobe({ trips, today, focus, stats }: { trips: Trip[]; today: string; focus?: Trip; stats?: React.ReactNode }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string>();

  const all = useMemo<GlobePin[]>(
    () =>
      trips.flatMap((t) => {
        const at = tripPlace(t);
        const done = t.stage === "memory" || (!!t.endDate && t.endDate < today);
        return at ? [{ id: t.id, lat: at[0], lng: at[1], destination: destinationOf(t), done, name: t.name }] : [];
      }),
    [trips, today],
  );
  const pins = useMemo(() => (filter === "all" ? all : all.filter((p) => (filter === "done" ? p.done : !p.done))), [all, filter]);
  const routes = useMemo(() => tripRoutes(trips.filter((t) => pins.some((p) => p.id === t.id)), today), [trips, pins, today]);
  const focusAt = useMemo(() => (focus ? tripPlace(focus) : undefined), [focus]);

  if (all.length === 0) return null;
  const selected = trips.find((t) => t.id === selectedId && pins.some((p) => p.id === t.id));
  const count = (f: Filter) => (f === "all" ? all.length : all.filter((p) => (f === "done" ? p.done : !p.done)).length);

  return (
    <section
      aria-label="Your trips on a globe"
      className="relative h-[360px] overflow-hidden rounded-[22px] min-[1024px]:h-full bg-[radial-gradient(circle_at_50%_46%,#f7f9fc,#dde5ee)] shadow-[var(--shadow-card)] min-[640px]:h-[440px] dark:bg-[radial-gradient(circle_at_50%_46%,#121a24,#04070b)]"
    >
      <Globe pins={pins} routes={routes} selectedId={selected?.id} onSelect={setSelectedId} focus={focusAt} className="absolute inset-0" />

      <div role="radiogroup" aria-label="Show" className="absolute top-3 left-3 flex rounded-full bg-card/88 p-0.5 shadow-[var(--shadow-float)] backdrop-blur-md">
        {(["all", "planned", "done"] as const).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={filter === f}
            onClick={() => {
              setFilter(f);
              setSelectedId(undefined);
            }}
            className={`tnum rounded-full px-3 py-1 text-[13px] transition-colors ${
              filter === f ? "bg-ink font-semibold text-on-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {LABEL[f]}
            <span className={`ml-1 ${filter === f ? "opacity-70" : "text-muted"}`}>{count(f)}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <Link
          key={selected.id}
          href={`/trips/${selected.id}`}
          className="press absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-card/95 p-3 pr-2 shadow-[var(--shadow-float)] backdrop-blur-md [animation:rise_320ms_cubic-bezier(.16,1,.3,1)_both]"
        >
          <TripTile trip={selected} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{selected.name}</span>
            <span className="tnum block truncate text-[14px] text-muted">{when(selected, today)}</span>
          </span>
          <Chevron size={18} className="shrink-0 -rotate-90 text-faint" />
        </Link>
      ) : (
        stats && <div className="pointer-events-none absolute bottom-3 left-3">{stats}</div>
      )}
    </section>
  );
}

/** One line for the selected trip: when it is, in the terms that matter for its stage. */
function when(t: Trip, today: string) {
  if (!t.startDate) return "Idea · no dates yet";
  const range = dateRange(t.startDate, t.endDate);
  if (t.stage === "memory" || t.endDate < today) return `${range} ${t.startDate.slice(0, 4)} · Memory`;
  if (t.startDate <= today) return `Happening now · ${range}`;
  const days = daysUntil(t.startDate, t.timezone);
  return `In ${days} ${days === 1 ? "day" : "days"} · ${range}`;
}
