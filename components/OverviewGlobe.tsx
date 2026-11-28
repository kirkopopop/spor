"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Trip } from "@/lib/types";
import { dateRange, daysUntil } from "@/lib/format";
import { destinationOf, tripPlace } from "@/lib/destination";
import { tripRoutes, tripStage } from "@/lib/tripView";
import { beenShading, tripPlaces } from "@/lib/places";
import { flightPlaces } from "@/lib/flights";
import { addPlace, removePlaces } from "@/lib/placesStore";
import { usePeople, usePrefs } from "@/lib/store";
import { useTravel } from "@/lib/useTravel";
import { Globe, type GlobeBeen, type GlobePin } from "./map/Globe";
import { TripTile } from "./Destination";
import { PlacesSheet } from "./PlacesSheet";
import { Sheet } from "./Sheet";
import { Chevron, Plus } from "./icons";

type Filter = "all" | "planning" | "live" | "memory" | "been";
const LABEL: Record<Filter, string> = { all: "All", planning: "Planning", live: "Live", memory: "Memory", been: "Been" };
const STAGE_FILTERS = ["planning", "live", "memory"] as const;
const EVERYONE = "everyone";

/**
 * Your world: every trip you're on, with a place on a globe you can turn, and the places each
 * person has been. Filter by stage (Planning, Live, Memory) or to Been; tap a pin for the trip, a country to
 * log it.
 */
export function OverviewGlobe({ trips, today, focus, stats }: { trips: Trip[]; today: string; focus?: Trip; stats?: React.ReactNode }) {
  const { members } = usePeople();
  const prefs = usePrefs();
  const { people, me, rows, beenOf, flightsOf } = useTravel(today);
  const all = useMemo<GlobePin[]>(
    () =>
      trips.flatMap((t) => {
        const at = tripPlace(t);
        const stage = tripStage(t, today);
        return at ? [{ id: t.id, lat: at[0], lng: at[1], destination: destinationOf(t), done: stage === "memory", stage, name: t.name }] : [];
      }),
    [trips, today],
  );
  const [filter, setFilter] = useState<Filter>(all.length ? "all" : "been");
  const [selectedId, setSelectedId] = useState<string>();
  const [person, setPerson] = useState<string | undefined>(me);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo?: () => void }>();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const shownPerson = person ?? me;
  const mine = beenOf(me);

  const pins = useMemo(() => (filter === "been" ? [] : filter === "all" ? all : all.filter((p) => p.stage === filter)), [all, filter]);
  const routes = useMemo(
    () =>
      tripRoutes(
        trips.filter((t) => pins.some((p) => p.id === t.id)),
        today,
      ),
    [trips, pins, today],
  );
  const focusAt = useMemo(() => (focus ? tripPlace(focus) : undefined), [focus]);
  const globeBeen = useMemo<GlobeBeen | undefined>(() => {
    if (filter !== "been") return undefined;
    const shown = shownPerson === EVERYONE ? people.map((p) => beenOf(p.userId)) : [beenOf(shownPerson)];
    const cities = shown.flatMap((b) => b.cities).filter((c): c is typeof c & { lat: number; lng: number } => c.lat != null && c.lng != null);
    return { shading: beenShading(shown), people: shown.length, cities: cities.map((c) => ({ lat: c.lat, lng: c.lng, name: c.name, country: c.country })) };
  }, [filter, shownPerson, people, beenOf]);
  const shownBeen = shownPerson === EVERYONE ? undefined : beenOf(shownPerson);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const say = (text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(undefined), 4500);
  };

  // A tap on a country in your own Been view logs it, or takes back one you logged by itself.
  async function tapCountry(iso: string, name: string) {
    if (shownPerson !== me) return;
    const logged = rows.filter((r) => r.userId === me && r.country === iso);
    const countryRow = logged.find((r) => r.kind === "country");
    try {
      if (!mine.countries.has(iso)) {
        const saved = await addPlace({ kind: "country", country: iso, name }, me);
        say(`Added ${name}`, () => saved.id && removePlaces([saved.id]));
      } else if (
        countryRow?.id &&
        logged.length === 1 &&
        ![...tripPlaces(trips, today, members.find((m) => m.userId === me)?.name), ...flightPlaces(flightsOf(me))].some((p) => p.country === iso)
      ) {
        await removePlaces([countryRow.id]);
        say(`Removed ${name}`, () => addPlace({ kind: "country", country: iso, name }, me));
      } else {
        say(`${name} comes from a trip, a flight or a city. Change it in Places.`);
      }
    } catch (e) {
      say(e instanceof Error ? e.message : "Couldn't change that place.");
    }
  }

  const selected = trips.find((t) => t.id === selectedId && pins.some((p) => p.id === t.id));
  const count = (f: Filter) => (f === "been" ? mine.countries.size : f === "all" ? all.length : all.filter((p) => p.stage === f).length);
  // Only the stages that have a trip, so the pill stays short.
  const filters: Filter[] = all.length ? ["all", ...STAGE_FILTERS.filter((s) => count(s) > 0), "been"] : ["been"];
  const firstName = (userId: string) => (userId === me ? "Me" : (members.find((m) => m.userId === userId)?.name ?? "").split(" ")[0]);

  return (
    <section
      aria-label="Your trips on a globe"
      className="relative h-[360px] overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_46%,#f7f9fc,#dde5ee)] shadow-[var(--shadow-card)] min-[640px]:h-[440px] min-[1024px]:h-full dark:bg-[radial-gradient(circle_at_50%_46%,#121a24,#04070b)]"
    >
      <Globe
        pins={pins}
        routes={routes}
        selectedId={selected?.id}
        onSelect={setSelectedId}
        focus={focusAt}
        been={globeBeen}
        cityMarks={prefs.cityMarks}
        onCountryTap={tapCountry}
        className="absolute inset-0"
      />

      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <Segmented
          label="Show"
          options={filters.map((f) => ({ value: f, label: LABEL[f], count: count(f) }))}
          value={filter}
          onChange={(f) => {
            setFilter(f as Filter);
            setSelectedId(undefined);
          }}
        />
        {filter === "been" && people.length > 1 && (
          <Segmented
            label="Whose"
            options={[
              ...people.map((p) => ({ value: p.userId, label: firstName(p.userId) })),
              { value: EVERYONE, label: people.length === 2 ? "Both" : "Everyone" },
            ]}
            value={shownPerson ?? ""}
            onChange={setPerson}
          />
        )}
      </div>

      {filter === "been" ? (
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <p className="tnum rounded-full bg-card/88 px-3 py-1.5 text-[13px] text-ink-2 shadow-[var(--shadow-float)] backdrop-blur-md">
            {shownBeen ? (
              <>
                <b className="font-semibold text-ink">{shownBeen.countries.size}</b> {shownBeen.countries.size === 1 ? "country" : "countries"} ·{" "}
                <b className="font-semibold text-ink">{shownBeen.cities.length}</b> {shownBeen.cities.length === 1 ? "city" : "cities"}
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">{Object.values(globeBeen?.shading ?? {}).filter((n) => n >= people.length).length}</b> countries together
              </>
            )}
          </p>
          <button
            onClick={() => setAdding(true)}
            className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[14px] font-semibold text-on-fill shadow-[var(--shadow-float)]"
          >
            <Plus size={16} />
            Places
          </button>
        </div>
      ) : selected ? (
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

      {toast && (
        <div
          role="status"
          className="absolute inset-x-3 bottom-16 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-2.5 text-[14px] text-on-ink shadow-[var(--shadow-float)] [animation:rise_240ms_cubic-bezier(.16,1,.3,1)_both]"
        >
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(undefined);
              }}
              className="press font-semibold text-accent-soft"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Out of the globe's panel (fixed on wide screens), so the sheet covers the whole page. */}
      {adding &&
        createPortal(
          <Sheet open onClose={() => setAdding(false)} label="Places been">
            <PlacesSheet me={me} logged={rows} been={mine} />
          </Sheet>,
          document.body,
        )}
    </section>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-card/88 p-0.5 shadow-[var(--shadow-float)] backdrop-blur-md">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`tnum rounded-full px-3 py-1 text-[13px] transition-colors ${value === o.value ? "bg-ink font-semibold text-on-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {o.label}
          {o.count != null && <span className={`ml-1 ${value === o.value ? "opacity-70" : "text-muted"}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** One line for the selected trip: when it is, in the terms that matter for its stage. */
function when(t: Trip, today: string) {
  const stage = tripStage(t, today);
  if (stage === "idea") return "Idea · no dates yet";
  const range = dateRange(t.startDate, t.endDate);
  if (stage === "memory") return `${range} ${t.startDate.slice(0, 4)} · Memory`;
  if (stage === "live") return `Live · ${range}`;
  const days = daysUntil(t.startDate, t.timezone);
  return `In ${days} ${days === 1 ? "day" : "days"} · ${range}`;
}
