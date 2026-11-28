"use client";

import { useState } from "react";
import type { Day, Stop, Trip } from "@/lib/types";
import { addExpense, addNote, deleteStop, saveStop, useCanEdit, usePeople, useTrip } from "@/lib/store";

// Small forms for edits made by hand on the phone. Planning stays with Claude;
// these cover the quick fixes: a stop, an expense, a note.

export const field = "h-12 w-full rounded-xl border border-line bg-card px-4 text-[16px] text-ink outline-none transition-colors focus:border-accent";
export const primaryButton = "press h-12 w-full rounded-xl bg-accent text-[16px] font-semibold text-on-fill disabled:opacity-40";
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-0.5 rounded-xl bg-soft p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`rounded-[10px] py-2 text-[13px] transition-colors ${o.value === value ? "bg-raised font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"}`}>
          {o.label}
        </button>
      ))}
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
  const valid = TIME.test(time) && name.trim().length > 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    saveStop(trip.id, { id: stop?.id ?? crypto.randomUUID(), dayId, time, name: name.trim(), kind, body: body.trim() || undefined, more: stop?.more });
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
              <option key={d.id} value={d.id}>{d.date}{d.title ? ` · ${d.title}` : ""}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="sr-only">Name</span>
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={200} />
      </label>
      <Segmented label="Kind" value={kind} onChange={setKind}
        options={[{ value: "fixed", label: "Fixed" }, { value: "normal", label: "Normal" }, { value: "optional", label: "Optional" }]} />
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
