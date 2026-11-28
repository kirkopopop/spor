"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  airlineCounts,
  airTimeText,
  duration,
  EARTH_KM,
  estimatedMinutes,
  flightBetween,
  flightMinutes,
  parseAirTime,
  searchAirports,
  travelStats,
  travelYears,
  type Airport,
  type Flight,
  type Stats,
} from "@/lib/flights";
import { addFlights, loadAirports, removeFlight, updateFlight } from "@/lib/flightsStore";
import { byContinent, CONTINENTS } from "@/lib/continents";
import { countryName } from "@/lib/countries";
import { highlights, latitude, population, type CityRef, type Highlight } from "@/lib/highlights";
import { useTravel } from "@/lib/useTravel";
import { field, primaryButton } from "./Forms";
import { FlightMap } from "./map/FlightMap";
import { Sheet } from "./Sheet";
import { Back, Chevron, Mode, Plus } from "./icons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ALL = "all";
const km = (n: number) => n.toLocaleString("en-GB");
// A total past ten hours reads in whole hours, so it fits beside the other figures.
const airTime = (s: Stats) => (s.flights === 0 ? "0h" : `${s.estimated ? "~" : ""}${s.minutes >= 600 ? `${Math.round(s.minutes / 60)}h` : duration(s.minutes)}`);
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const firstName = (name?: string) => (name ?? "").split(" ")[0];

/** Overview's travel numbers for the signed-in person: all time or this year; the sheet has the rest. */
export function TravelCard({ today }: { today: string }) {
  const travel = useTravel(today);
  const { me, trips, beenOf, flightsOf, nameOf } = travel;
  const [range, setRange] = useState<string>(ALL);
  const [open, setOpen] = useState(false);
  const year = today.slice(0, 4);
  const stats = travelStats({
    flights: flightsOf(me),
    trips,
    today,
    personName: nameOf(me),
    beenCountries: beenOf(me).countries,
    year: range === ALL ? undefined : year,
  });

  return (
    <section className="relative rounded-[22px] bg-card p-5 shadow-[var(--shadow-card)]">
      {/* The whole card opens the sheet; the range switch sits above this layer. */}
      <button onClick={() => setOpen(true)} aria-label="Open travel stats" className="press absolute inset-0 rounded-[22px]" />
      <div className="pointer-events-none relative flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1 text-[20px] font-bold tracking-[-0.02em]">
          Travel
          <Chevron size={18} className="-rotate-90 text-faint" />
        </h2>
        <div className="pointer-events-auto">
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: ALL, label: "All time" },
              { value: year, label: year },
            ]}
          />
        </div>
      </div>
      <dl className="pointer-events-none relative mt-4 grid grid-cols-2 gap-x-4 gap-y-4 min-[420px]:grid-cols-4">
        <Figure value={String(stats.countries)} label={stats.countries === 1 ? "country" : "countries"} />
        <Figure value={String(stats.flights)} label={stats.flights === 1 ? "flight" : "flights"} />
        <Figure value={airTime(stats)} label="in the air" />
        <Figure value={km(stats.km)} label="km flown" />
      </dl>
      {open &&
        createPortal(
          <Sheet open onClose={() => setOpen(false)} label="Travel">
            <TravelSheet today={today} travel={travel} />
          </Sheet>,
          document.body,
        )}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tnum text-[24px] leading-tight font-bold tracking-[-0.02em]">{value}</dd>
    </div>
  );
}

type Travel = ReturnType<typeof useTravel>;

/** Everything about where someone went and how far they flew, by year, with their flights. */
function TravelSheet({ today, travel }: { today: string; travel: Travel }) {
  const { me, people, companions, trips, beenOf, flightsOf, nameOf } = travel;
  const [person, setPerson] = useState(me ?? "");
  const [range, setRange] = useState<string>(ALL);
  const [editing, setEditing] = useState<Flight | "new">();
  const [airports, setAirports] = useState<Map<string, Airport>>();
  useEffect(() => {
    let live = true;
    loadAirports().then((all) => live && setAirports(new Map(all.map((a) => [a[0], a]))));
    return () => {
      live = false;
    };
  }, []);

  const flights = flightsOf(person);
  const been = beenOf(person);
  const name = nameOf(person);
  const years = useMemo(() => travelYears(flights, trips, today, name), [flights, trips, today, name]);
  const shownRange = range === ALL || years.includes(range) ? range : ALL; // a year can vanish with its last flight
  const year = shownRange === ALL ? undefined : shownRange;
  const stats = travelStats({ flights, trips, today, personName: name, beenCountries: been.countries, year });
  const homeAt = useMemo(() => homeAirport(flights, airports), [flights, airports]);
  const shown = useMemo(() => [...(year ? flights.filter((f) => f.date.startsWith(year)) : flights)].sort((a, b) => b.date.localeCompare(a.date)), [flights, year]);

  if (editing)
    return (
      <FlightForm
        flight={editing === "new" ? undefined : editing}
        airports={airports}
        people={companions}
        defaultPerson={person}
        knownAirlines={airlineCounts(flightsOf(me)).map(([a]) => a)}
        today={today}
        onDone={() => setEditing(undefined)}
      />
    );

  const laps = stats.km / EARTH_KM;
  const perYear = years.map((y) => ({ year: y, km: flights.filter((f) => f.date.startsWith(y)).reduce((n, f) => n + f.km, 0) }));
  const maxKm = Math.max(1, ...perYear.map((y) => y.km));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pr-10">
        <h3 className="text-[22px] font-bold tracking-[-0.02em]">Travel</h3>
        {people.length > 1 && (
          <Segmented
            label="Whose"
            value={person}
            onChange={setPerson}
            options={people.map((p) => ({ value: p.userId, label: p.userId === me ? "Me" : firstName(nameOf(p.userId)) }))}
          />
        )}
      </div>

      {years.length > 0 && (
        <div role="radiogroup" aria-label="Year" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {[ALL, ...years].map((y) => (
            <button
              key={y}
              role="radio"
              aria-checked={shownRange === y}
              onClick={() => setRange(y)}
              className={`press tnum shrink-0 rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${
                shownRange === y ? "bg-ink font-semibold text-on-ink" : "bg-soft text-ink-2"
              }`}
            >
              {y === ALL ? "All time" : y}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="tnum flex items-baseline gap-2">
          <span className="text-[52px] leading-none font-semibold tracking-[-0.03em]">{km(stats.km)}</span>
          <span className="text-[20px] font-semibold text-muted">km flown</span>
        </p>
        {stats.km > 0 && (
          <p className="mt-1.5 text-[15px] text-ink-2">
            {laps < 1 ? `${Math.max(1, Math.round(laps * 100))}% of the way around the Earth` : `${laps.toFixed(1)} times around the Earth`}
          </p>
        )}
      </div>

      {shown.length > 0 && airports && (
        <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)]" key={`${person}-${shownRange}`}>
          <FlightMap flights={shown} airports={airports} been={been.countries} />
        </div>
      )}

      <dl className="grid grid-cols-3 divide-x divide-divider rounded-2xl bg-card py-3.5 shadow-[var(--shadow-card)]">
        <Cell value={String(stats.countries)} label={stats.countries === 1 ? "country" : "countries"} />
        <Cell value={String(stats.flights)} label={stats.flights === 1 ? "flight" : "flights"} />
        <Cell value={airTime(stats)} label="in the air" />
      </dl>

      {stats.countries > 0 && <Continents codes={stats.countryCodes} />}

      {stats.longest && (
        <p className="tnum -mt-2 px-1 text-[14px] text-muted">
          Longest: <span className="font-medium text-ink-2">{stats.longest.from} → {stats.longest.to}</span>, {km(stats.longest.km)} km,{" "}
          {stats.longest.minutes == null && "~"}
          {duration(flightMinutes(stats.longest))}
        </p>
      )}

      {stats.airlines.length > 0 && (
        <p className="tnum -mt-3 px-1 text-[14px] text-muted">
          {stats.airlines.length === 1 ? "Airline" : "Airlines"}:{" "}
          {stats.airlines.slice(0, 4).map(([a, n], i) => (
            <span key={a}>
              {i > 0 && ", "}
              <span className="font-medium text-ink-2">{a}</span> {n}
            </span>
          ))}
          {stats.airlines.length > 4 && `, +${stats.airlines.length - 4} more`}
        </p>
      )}

      {!year && <Highlights cities={been.cities} home={homeAt} />}

      {!year && perYear.length > 1 && (
        <section aria-label="Kilometres flown by year">
          <h4 className="mb-1.5 px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">By year</h4>
          <ul className="flex flex-col rounded-2xl bg-card py-1.5 shadow-[var(--shadow-card)]">
            {perYear.map((y) => (
              <li key={y.year}>
                <button
                  onClick={() => setRange(y.year)}
                  aria-label={`${y.year}: ${km(y.km)} km`}
                  className="press flex min-h-11 w-full items-center gap-3 px-4 text-left hover:bg-soft/60"
                >
                  <span className="tnum w-11 shrink-0 text-[15px] font-semibold">{y.year}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(y.km / maxKm) * 100}%` }} />
                  </span>
                  <span className="tnum w-24 shrink-0 text-right text-[14px] text-ink-2">{y.km ? `${km(y.km)} km` : "No flights"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Flights">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h4 className="text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Flights</h4>
          <button onClick={() => setEditing("new")} className="press inline-flex items-center gap-1 text-[15px] font-semibold text-accent">
            <Plus size={16} />
            Add flight
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-3.5 text-[15px] text-muted shadow-[var(--shadow-card)]">None yet.</p>
        ) : (
          <ul className="divide-y divide-divider overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
            {shown.map((f, i) => (
              <li key={f.id}>
                {(i === 0 || shown[i - 1].date.slice(0, 4) !== f.date.slice(0, 4)) && !year && (
                  <div className="tnum bg-soft/60 px-4 py-1 text-[13px] font-semibold text-muted">{f.date.slice(0, 4)}</div>
                )}
                <button onClick={() => setEditing(f)} className="press flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
                  <Mode mode="plane" size={18} className="shrink-0 text-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="tnum block text-[16px] font-semibold">
                      {f.from} → {f.to}
                    </span>
                    <span className="block truncate text-[14px] text-muted">
                      {dayMonth(f.date)}
                      {f.airline && ` · ${f.airline}`}
                      {airports && ` · ${place(airports.get(f.from))} to ${place(airports.get(f.to))}`}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right">
                    <span className="block text-[15px]">{km(f.km)} km</span>
                    <span className="block text-[13px] text-muted">
                      {f.minutes == null && "~"}
                      {duration(flightMinutes(f))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Home for "furthest from home": the airport most of a person's flights leave from. */
function homeAirport(flights: Flight[], airports?: Map<string, Airport>): [number, number] | undefined {
  const n = new Map<string, number>();
  for (const f of flights) n.set(f.from, (n.get(f.from) ?? 0) + 1);
  const a = airports?.get([...n].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "");
  return a && [a[4], a[5]];
}

/** How many continents, and the countries on each. */
function Continents({ codes }: { codes: string[] }) {
  const groups = byContinent(codes);
  if (!groups.length) return null;
  return (
    <section aria-label="Continents" className="-mt-2">
      <h4 className="mb-1.5 flex items-baseline justify-between px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
        Continents
        <span className="tnum tracking-normal normal-case">
          <b className="font-semibold text-ink">{groups.length}</b> of {CONTINENTS.length}
        </span>
      </h4>
      <ul className="divide-y divide-divider rounded-2xl bg-card shadow-[var(--shadow-card)]">
        {groups.map((g) => (
          <li key={g.continent} className="flex min-h-12 items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{g.continent}</span>
              <span className="block truncate text-[13px] text-muted">
                {g.countries
                  .map(countryName)
                  .sort((a, b) => a.localeCompare(b))
                  .join(", ")}
              </span>
            </span>
            <span className="tnum shrink-0 text-[15px] text-ink-2">
              {g.countries.length} {g.countries.length === 1 ? "country" : "countries"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

let cityRefs: Promise<CityRef[]> | undefined;
const loadCities = () => (cityRefs ??= import("@/assets/geo/cities.json").then((m) => m.default as unknown as CityRef[]));

const HIGHLIGHT: Record<Highlight["kind"], string> = {
  north: "Furthest north",
  south: "Furthest south",
  biggest: "Biggest city",
  smallest: "Smallest city",
  farthest: "Furthest from home",
  capitals: "Capitals",
};

function detail(h: Exclude<Highlight, { kind: "capitals" }>) {
  switch (h.kind) {
    case "north":
    case "south":
      return latitude(h.lat);
    case "farthest":
      return `${km(h.km)} km`;
    default:
      return `${population(h.population)} people`;
  }
}

/** A few standout facts about the cities been to; all time, as cities carry no dates. */
function Highlights({ cities, home }: { cities: { name: string; country: string; lat?: number; lng?: number }[]; home?: [number, number] }) {
  const [refs, setRefs] = useState<CityRef[]>();
  useEffect(() => {
    let live = true;
    loadCities().then((r) => live && setRefs(r));
    return () => {
      live = false;
    };
  }, []);
  const list = useMemo(() => (refs ? highlights(cities, refs, home) : []), [refs, cities, home]);
  if (!list.length) return null;
  return (
    <section aria-label="Highlights">
      <h4 className="mb-1.5 px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Highlights</h4>
      <ul className="grid grid-cols-2 gap-2.5">
        {list.map((h) => (
          <li key={h.kind} className="rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[13px] text-muted">{HIGHLIGHT[h.kind]}</p>
            {h.kind === "capitals" ? (
              <>
                <p className="tnum text-[17px] leading-snug font-semibold">
                  {h.count} {h.count === 1 ? "capital" : "capitals"}
                </p>
                <p className="line-clamp-2 text-[13px] text-ink-2">{h.names.join(", ")}</p>
              </>
            ) : (
              <>
                <p className="truncate text-[17px] leading-snug font-semibold">{h.city}</p>
                <p className="tnum truncate text-[13px] text-ink-2">
                  {detail(h)} · {countryName(h.country)}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 px-1 text-[12px] text-faint">City sizes are metro populations from Natural Earth; cities it doesn't list aren't sized.</p>
    </section>
  );
}

const place = (a?: Airport) => (a ? a[2].split(",")[0] || a[1] : "?");

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse items-center px-2">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tnum text-[22px] leading-tight font-bold tracking-[-0.02em]">{value}</dd>
    </div>
  );
}

/** A flight by hand: when, from, to, and air time if known. Distance comes from the airports. */
function FlightForm({
  flight,
  airports,
  people,
  defaultPerson,
  knownAirlines,
  today,
  onDone,
}: {
  flight?: Flight;
  airports?: Map<string, Airport>;
  people: { userId: string; name: string }[];
  defaultPerson: string;
  knownAirlines: string[];
  today: string;
  onDone: () => void;
}) {
  const [date, setDate] = useState(flight?.date ?? today);
  const [from, setFrom] = useState<Airport | undefined>(flight && airports?.get(flight.from));
  const [to, setTo] = useState<Airport | undefined>(flight && airports?.get(flight.to));
  const [time, setTime] = useState(flight?.minutes ? airTimeText(flight.minutes) : "");
  const [airline, setAirline] = useState(flight?.airline ?? "");
  const [who, setWho] = useState<string[]>([flight?.userId ?? defaultPerson]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const between = from && to ? flightBetween(from, to) : undefined;
  const minutes = time.trim() ? parseAirTime(time) : undefined;
  const valid = !!between && from![0] !== to![0] && /^\d{4}-\d{2}-\d{2}$/.test(date) && (!time.trim() || minutes != null) && who.length > 0;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that flight.");
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !between) return;
    const base = { ...between, date, minutes, airline: airline.trim() || undefined };
    void run(() => (flight ? updateFlight(flight.id, { ...base, userId: flight.userId }) : addFlights(who.map((userId) => ({ ...base, userId })))));
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pr-10">
        <button type="button" onClick={onDone} aria-label="Back to travel" className="press -ml-2 flex size-10 items-center justify-center rounded-full text-ink-2">
          <Back size={22} />
        </button>
        <h3 className="text-xl font-bold tracking-[-0.02em]">{flight ? "Edit flight" : "Add flight"}</h3>
      </div>

      <label>
        <span className="mb-1 block px-1 text-[13px] font-medium text-muted">Date</span>
        <input type="date" required value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value)} className={field} />
      </label>
      <AirportField label="From" value={from} onChange={setFrom} airports={airports} />
      <AirportField label="To" value={to} onChange={setTo} airports={airports} />
      {from && to && from[0] === to[0] && <p className="-mt-1 px-1 text-[14px] text-danger">From and to are the same airport.</p>}

      <label>
        <span className="mb-1 block px-1 text-[13px] font-medium text-muted">Air time</span>
        <input
          inputMode="numeric"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder={between ? `~${airTimeText(estimatedMinutes(between.km))}` : "h:mm"}
          className={field}
          aria-invalid={!!time.trim() && minutes == null}
        />
      </label>
      {between && from![0] !== to![0] && (
        <p className="tnum -mt-1 px-1 text-[14px] text-muted">
          {km(between.km)} km{!time.trim() && ", air time estimated"}
        </p>
      )}

      <label>
        <span className="mb-1 block px-1 text-[13px] font-medium text-muted">Airline</span>
        <input
          value={airline}
          onChange={(e) => setAirline(e.target.value)}
          maxLength={60}
          list="known-airlines"
          autoComplete="off"
          placeholder="Optional, e.g. SAS"
          className={field}
        />
        <datalist id="known-airlines">
          {knownAirlines.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>

      {!flight && people.length > 1 && (
        <div role="group" aria-label="Who flew" className="flex flex-wrap gap-2">
          {people.map((p) => {
            const on = who.includes(p.userId);
            return (
              <button
                key={p.userId}
                type="button"
                aria-pressed={on}
                onClick={() => setWho(on ? who.filter((w) => w !== p.userId) : [...who, p.userId])}
                className={`press rounded-full px-4 py-2 text-[15px] transition-colors ${on ? "bg-ink font-semibold text-on-ink" : "bg-soft text-ink-2"}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="px-1 text-[14px] text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={!valid || busy} className={`${primaryButton} mt-1`}>
        Save
      </button>
      {flight &&
        (confirmDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeFlight(flight.id))}
            className="press h-12 rounded-xl bg-danger text-[15px] font-semibold text-on-fill"
          >
            Delete {flight.from} → {flight.to}?
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 text-[15px] text-danger">
            Delete
          </button>
        ))}
    </form>
  );
}

function AirportField({
  label,
  value,
  onChange,
  airports,
}: {
  label: string;
  value?: Airport;
  onChange: (a?: Airport) => void;
  airports?: Map<string, Airport>;
}) {
  const [q, setQ] = useState("");
  const all = useMemo(() => (airports ? [...airports.values()] : []), [airports]);
  const results = value ? [] : searchAirports(all, q);

  return (
    <div>
      <label>
        <span className="mb-1 block px-1 text-[13px] font-medium text-muted">{label}</span>
        <input
          value={value ? `${value[2].split(",")[0] || value[1]} · ${value[0]}` : q}
          onChange={(e) => {
            onChange(undefined);
            setQ(e.target.value.replace(/ · [A-Z]{3}$/, ""));
          }}
          onFocus={(e) => value && e.currentTarget.select()}
          placeholder={airports ? "City, airport or code" : "Loading airports…"}
          disabled={!airports}
          autoComplete="off"
          className={field}
        />
      </label>
      {results.length > 0 && (
        <ul className="mt-1.5 divide-y divide-divider overflow-hidden rounded-xl bg-card shadow-[var(--shadow-float)]" aria-label={`${label} airports`}>
          {results.map((a) => (
            <li key={a[0]}>
              <button
                type="button"
                onClick={() => {
                  onChange(a);
                  setQ("");
                }}
                className="press flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-soft/60"
              >
                <span className="tnum w-10 shrink-0 text-[15px] font-semibold">{a[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{a[1]}</span>
                  <span className="block truncate text-[13px] text-muted">{a[2] || a[3]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Segmented({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-soft p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`tnum rounded-full px-3 py-1 text-[13px] transition-colors ${value === o.value ? "bg-raised font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
