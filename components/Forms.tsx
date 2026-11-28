"use client";

import { useEffect, useMemo, useState } from "react";
import type { Day, Stop, Trip } from "@/lib/types";
import { addExpense, addNote, deleteStop, saveStop, useCanEdit, usePeople, useTrip } from "@/lib/store";
import { dayMonth } from "@/lib/format";
import { tripPlace } from "@/lib/destination";
import { searchPlaces, type PlaceResult } from "@/lib/countries";
import { Close, Pin } from "./icons";

// Small forms for edits made by hand on the phone. Planning stays with Claude;
// these cover the quick fixes: a stop, an expense, a note.

export const field = "h-12 w-full rounded-xl border border-line bg-card px-4 text-[16px] text-ink outline-none transition-colors focus:border-accent";
export const primaryButton = "press h-12 w-full rounded-xl bg-accent text-[16px] font-semibold text-on-fill disabled:opacity-40";
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-0.5 rounded-xl bg-soft p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-[13px] transition-colors ${o.value === value ? "bg-raised font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"}`}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// The kinds as the plan draws them: the same number disc, and what each means for the day.
const KIND: Record<Stop["kind"], { label: string; hint: string }> = {
  fixed: { label: "Fixed", hint: "Can't move: a train, a booked time." },
  normal: { label: "Normal", hint: "Part of the plan; times can shift." },
  optional: { label: "Optional", hint: "First to drop if the day runs late." },
};

function KindDot({ kind }: { kind: Stop["kind"] }) {
  const cls = kind === "fixed" ? "bg-fixed-soft border-fixed" : kind === "optional" ? "border-dashed border-faint bg-card" : "bg-accent-soft border-accent-ink";
  return <span aria-hidden="true" className={`size-3 shrink-0 rounded-full border-[1.5px] ${cls}`} />;
}

type StopPlace = { name: string; lat: number; lng: number };

/** Where a stop is: a search (Photon, near the trip), the chosen place, or nothing. */
function PlaceField({ place, near, onChange }: { place: StopPlace | null; near?: [number, number]; onChange: (p: StopPlace | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  // As you type: a short pause first, and each keystroke cancels the last request.
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(q, near, ctl.signal));
      } catch {
        if (!ctl.signal.aborted) setResults([]);
      } finally {
        if (!ctl.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, near]);

  if (place) {
    return (
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-card pr-1.5 pl-4">
        <Pin size={18} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-[16px]">{place.name}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove place" className="press flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink">
          <Close size={14} />
        </button>
      </div>
    );
  }
  const shown = q.trim().length >= 2 ? results : [];
  return (
    <div className="flex flex-col gap-1.5">
      <label className="relative block">
        <span className="sr-only">Place</span>
        <Pin size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Place" autoComplete="off" className={`${field} pl-11`} />
        {searching && <span className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />}
      </label>
      {shown.length > 0 && (
        <ul aria-label="Places" className="divide-y divide-divider overflow-hidden rounded-xl border border-line">
          {shown.map((r) => (
            <li key={`${r.name}-${r.lat}-${r.lng}`}>
              <button type="button" onClick={() => (onChange({ name: r.name, lat: r.lat, lng: r.lng }), setQ(""))} className="press flex w-full flex-col px-4 py-2.5 text-left">
                <span className="truncate text-[15px]">{r.name}</span>
                {r.detail && <span className="truncate text-[13px] text-muted">{r.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shown in place of a form on a trip someone shared with you to view. */
export function ViewOnly() {
  return <p className="pr-10 text-[15px] text-muted">You can view this trip. Ask its owner for edit access to change it.</p>;
}

export function StopForm({ trip, day, stop, onDone }: { trip: Trip; day: Day; stop?: Stop; onDone: () => void }) {
  const canEdit = useCanEdit(trip);
  const [time, setTime] = useState(stop?.time ?? "");
  const [name, setName] = useState(stop?.name ?? "");
  const [kind, setKind] = useState<Stop["kind"]>(stop?.kind ?? "normal");
  const [body, setBody] = useState(stop?.body ?? "");
  const [dayId, setDayId] = useState(day.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Where the stop is. Untouched, it keeps whatever place it had (Claude's stops keep theirs).
  const [place, setPlace] = useState<StopPlace | null>(stop?.lat != null && stop.lng != null ? { name: "On the map", lat: stop.lat, lng: stop.lng } : null);
  const [placeTouched, setPlaceTouched] = useState(false);
  const valid = TIME.test(time) && name.trim().length > 0;
  const near = useMemo(() => {
    const here = trip.days.find((d) => d.id === dayId)?.stops.find((s) => s.lat != null && s.lng != null);
    return here ? ([here.lat!, here.lng!] as [number, number]) : tripPlace(trip);
  }, [trip, dayId]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    saveStop(trip.id, {
      id: stop?.id ?? crypto.randomUUID(),
      dayId,
      time,
      name: name.trim(),
      kind,
      body: body.trim() || undefined,
      more: stop?.more,
      ...(placeTouched ? { lat: place?.lat ?? null, lng: place?.lng ?? null } : {}),
    });
    onDone();
  }

  if (!canEdit) return <ViewOnly />;
  return (
    <form onSubmit={save} className="flex flex-col gap-3 pr-10">
      <h3 className="text-xl font-bold tracking-[-0.02em]">{stop ? "Edit stop" : "New stop"}</h3>
      <div className="flex gap-2">
        <label className="w-28 shrink-0">
          <span className="sr-only">Time</span>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={field} />
        </label>
        <label className="flex-1">
          <span className="sr-only">Day</span>
          <select value={dayId} onChange={(e) => setDayId(e.target.value)} className={field}>
            {trip.days.map((d) => (
              <option key={d.id} value={d.id}>{dayMonth(d.date)}{d.title ? ` · ${d.title}` : ""}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="sr-only">Name</span>
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={200} />
      </label>
      <PlaceField
        place={place}
        near={near}
        onChange={(p) => {
          setPlace(p);
          setPlaceTouched(true);
          if (p && !name.trim()) setName(p.name);
        }}
      />
      <div className="flex flex-col gap-1.5">
        <Segmented label="Kind" value={kind} onChange={setKind}
          options={(["fixed", "normal", "optional"] as const).map((k) => ({ value: k, label: KIND[k].label, icon: <KindDot kind={k} /> }))} />
        <p className="px-1 text-[13px] text-muted">{KIND[kind].hint}</p>
      </div>
      <label>
        <span className="sr-only">Details</span>
        <textarea placeholder="Details" value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-[16px] outline-none focus:border-accent" />
      </label>
      <button type="submit" disabled={!valid} className={primaryButton}>Save</button>
      {stop &&
        (confirmDelete ? (
          <button type="button" onClick={() => { deleteStop(trip.id, stop.id); onDone(); }}
            className="press h-12 rounded-xl bg-danger text-[15px] font-semibold text-on-fill">
            Delete {stop.name}?
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 text-[15px] text-danger">Delete</button>
        ))}
    </form>
  );
}

const CATEGORIES = ["food", "transport", "tickets", "stay", "other"];

export function ExpenseForm({ trip, stopId, onDone }: { trip: Trip; stopId?: string; onDone: () => void }) {
  const { members: people, me } = usePeople();
  const members = trip.members ?? people; // who can have paid: the people on this trip
  const canEdit = useCanEdit(trip);
  const categories = [...new Set([...trip.budget.map((b) => b.category), ...CATEGORIES])];
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "food");
  const [paidBy, setPaidBy] = useState(me ?? "");
  const [note, setNote] = useState("");
  const value = Number(amount.replace(",", "."));
  const valid = value > 0 && value < 100000;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    addExpense(trip.id, { amount: Math.round(value * 100) / 100, currency: trip.currency, category, paidBy: paidBy || undefined, stopId, note: note.trim() || undefined });
    onDone();
  }

  if (!canEdit) return <ViewOnly />;
  return (
    <form onSubmit={save} className="flex flex-col gap-3 pr-10">
      <h3 className="text-xl font-bold tracking-[-0.02em]">Expense</h3>
      <label>
        <span className="sr-only">Amount in {trip.currency}</span>
        <input autoFocus required inputMode="decimal" placeholder={`Amount, ${trip.currency}`} value={amount}
          onChange={(e) => setAmount(e.target.value)} className={`${field} text-[22px] font-semibold`} />
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
        {categories.map((c) => {
          const label = trip.budget.find((b) => b.category === c)?.label ?? c[0].toUpperCase() + c.slice(1);
          return (
            <button key={c} type="button" role="radio" aria-checked={c === category} onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-2 text-[13px] ${c === category ? "bg-accent text-on-fill" : "bg-soft text-ink-2"}`}>
              {label}
            </button>
          );
        })}
      </div>
      {members.length > 1 && (
        <Segmented label="Paid by" value={paidBy} onChange={setPaidBy}
          options={members.map((m) => ({ value: m.userId, label: m.userId === me ? "Me" : m.name }))} />
      )}
      <label>
        <span className="sr-only">Note</span>
        <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className={field} maxLength={200} />
      </label>
      <button type="submit" disabled={!valid} className={primaryButton}>Add</button>
    </form>
  );
}

export function NoteForm({ tripId, stopId, dayId, onDone, compact }: {
  tripId: string; stopId?: string; dayId?: string; onDone?: () => void; compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const canEdit = useCanEdit(useTrip(tripId).trip);
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addNote(tripId, { body: body.trim(), stopId, dayId });
    setBody("");
    onDone?.();
  }
  if (!canEdit) return null;
  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label>
        <span className="sr-only">Note</span>
        <textarea placeholder={stopId ? "Note on this stop" : "Note"} value={body} onChange={(e) => setBody(e.target.value)}
          rows={compact ? 2 : 3} maxLength={4000}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-[16px] outline-none focus:border-accent" />
      </label>
      {body.trim() && <button type="submit" className={primaryButton}>Add note</button>}
    </form>
  );
}
