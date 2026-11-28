"use client";

import { useEffect, useMemo, useState } from "react";
import { countryName, searchCities, searchCountries } from "@/lib/countries";
import type { Been, Place } from "@/lib/places";
import { addPlace, removePlaces, renamePlace } from "@/lib/placesStore";
import { Check, Close, Plus } from "./icons";
import { field } from "./Forms";

/**
 * Places been, for the signed-in person: one field finds a country or a city; below it, everything
 * so far, by country. Trips that have ended are there already and can't be removed here.
 */
export function PlacesSheet({ me, logged, been }: { me?: string; logged: Place[]; been: Been }) {
  const [q, setQ] = useState("");
  const [cities, setCities] = useState<(Place & { region?: string })[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();
  const [renaming, setRenaming] = useState<string>(); // id of the city being renamed
  const mine = useMemo(() => logged.filter((p) => p.userId === me), [logged, me]);

  // Cities as you type: a short pause first, and each new keystroke cancels the last request.
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setCities(await searchCities(q, ctl.signal));
      } catch {
        if (!ctl.signal.aborted) setCities([]);
      } finally {
        if (!ctl.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const countries = searchCountries(q);
  const shownCities = q.trim().length >= 2 ? cities : []; // a cleared field shows no stale results
  // Been already: a country in any way (logged, a city in it, a trip); a city by name in that country.
  const has = (p: Pick<Place, "kind" | "country" | "name">) =>
    p.kind === "country" ? been.countries.has(p.country) : been.cities.some((c) => c.country === p.country && c.name.toLowerCase() === p.name.toLowerCase());

  async function add(p: Omit<Place, "id" | "userId" | "fromTrip">) {
    setError(undefined);
    try {
      await addPlace(p, me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that place.");
    }
  }
  async function remove(ids: string[]) {
    setError(undefined);
    try {
      await removePlaces(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that place.");
    }
  }

  // Everything so far, by country: logged and from trips, with which can be removed.
  const byCountry = [...been.countries]
    .map((code) => ({
      code,
      name: countryName(code),
      fromTrip: !mine.some((m) => m.country === code) || undefined,
      cities: been.cities.filter((c) => c.country === code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4 pr-10">
      <div>
        <h3 className="text-[22px] font-bold tracking-[-0.02em]">Places been</h3>
        <p className="tnum mt-0.5 text-[15px] text-muted">
          {been.countries.size} {been.countries.size === 1 ? "country" : "countries"} · {been.cities.length} {been.cities.length === 1 ? "city" : "cities"}
        </p>
      </div>

      <label className="relative block">
        <span className="sr-only">Find a country or city</span>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a country or city" className={field} autoComplete="off" />
        {searching && (
          <span
            className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-accent"
            aria-hidden="true"
          />
        )}
      </label>
      {error && (
        <p role="alert" className="-mt-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      {q.trim() ? (
        <ul className="divide-y divide-divider overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]" aria-label="Results">
          {countries.map((c) => (
            <Result
              key={c.code}
              title={c.name}
              subtitle="Country"
              added={has({ kind: "country", country: c.code, name: c.name })}
              onAdd={() => add({ kind: "country", country: c.code, name: c.name })}
            />
          ))}
          {shownCities.map((c) => (
            <Result
              key={`${c.country}-${c.name}-${c.lat}`}
              title={c.name}
              subtitle={c.region || countryName(c.country)}
              added={has(c)}
              onAdd={() => add({ kind: "city", country: c.country, name: c.name, lat: c.lat, lng: c.lng })}
            />
          ))}
          {countries.length === 0 && shownCities.length === 0 && !searching && <li className="px-4 py-3 text-[15px] text-muted">Nothing called that.</li>}
        </ul>
      ) : byCountry.length === 0 ? (
        <p className="text-[15px] text-muted">None yet. Trips you&rsquo;ve finished show here by themselves.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Your places">
          {byCountry.map((c) => (
            <li key={c.code} className="rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[16px] font-semibold">{c.name}</span>
                {c.fromTrip ? (
                  <span className="text-[13px] text-muted">From a trip or flight</span>
                ) : (
                  // Removing a country takes the cities you logged in it along.
                  <RemoveButton label={`Remove ${c.name}`} onClick={() => remove(mine.filter((m) => m.country === c.code && m.id).map((m) => m.id!))} />
                )}
              </div>
              {c.cities.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.cities.map((city) => {
                    const row = mine.find((m) => m.kind === "city" && m.country === city.country && m.name === city.name);
                    if (row?.id && renaming === row.id) {
                      return (
                        <li key={city.name} className="w-full">
                          <RenameField
                            name={city.name}
                            onSave={async (name) => {
                              setRenaming(undefined);
                              setError(undefined);
                              try {
                                await renamePlace(row.id!, name);
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "Couldn't rename that place.");
                              }
                            }}
                            onCancel={() => setRenaming(undefined)}
                          />
                        </li>
                      );
                    }
                    return (
                      <li key={city.name} className="inline-flex items-center gap-1 rounded-full bg-soft py-1 pr-1.5 pl-3 text-[14px] text-ink-2">
                        {row?.id ? (
                          <button onClick={() => setRenaming(row.id)} aria-label={`Rename ${city.name}`} className="press text-left">
                            {city.name}
                          </button>
                        ) : (
                          city.name
                        )}
                        {row?.id ? (
                          <button
                            onClick={() => remove([row.id!])}
                            aria-label={`Remove ${city.name}`}
                            className="press flex size-5 items-center justify-center rounded-full text-muted hover:text-ink"
                          >
                            <Close size={12} />
                          </button>
                        ) : (
                          <span className="pr-1.5 text-[12px] text-muted">trip</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Result({ title, subtitle, added, onAdd }: { title: string; subtitle: string; added: boolean; onAdd: () => void }) {
  return (
    <li>
      <button onClick={added ? undefined : onAdd} disabled={added} className="press flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px]">{title}</span>
          <span className="block truncate text-[13px] text-muted">{subtitle}</span>
        </span>
        {added ? (
          <span className="inline-flex items-center gap-1 text-[14px] font-medium text-ok">
            <Check size={15} /> Been
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Plus size={16} />
          </span>
        )}
      </button>
    </li>
  );
}

/** A city's name, in place, ready to type over. Enter saves, Escape puts it back. */
function RenameField({ name, onSave, onCancel }: { name: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  const valid = value.trim().length > 0 && value.trim().length <= 120;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(value);
      }}
      className="flex items-center gap-2"
    >
      <label className="flex-1">
        <span className="sr-only">Name of {name}</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation(); // close the field, not the sheet
              e.preventDefault();
              onCancel();
            }
          }}
          onFocus={(e) => e.target.select()}
          maxLength={120}
          className={`${field} h-11`}
        />
      </label>
      <button type="submit" disabled={!valid} className="press h-11 rounded-xl bg-accent px-4 text-[15px] font-semibold text-on-fill disabled:opacity-40">
        Save
      </button>
    </form>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="press text-[14px] font-medium text-danger">
      Remove
    </button>
  );
}
