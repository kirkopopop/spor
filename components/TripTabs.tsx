"use client";

import { useState } from "react";
import { money, plannedTotal } from "@/lib/format";
import { settle, spentByCategory } from "@/lib/money";
import { deleteExpense, deleteNote, useHousehold } from "@/lib/store";
import type { Booking, Note, Trip } from "@/lib/types";
import { Back, Check } from "./icons";
import { Fold } from "./Fold";
import { Sheet } from "./Sheet";
import { ExpenseForm, NoteForm } from "./Forms";

function TabHeader({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-13">
      <button
        onClick={onBack}
        aria-label="Back to plan"
        className="press flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-card"
      >
        <Back size={18} />
      </button>
      <h1 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{trip.name}</h1>
    </header>
  );
}

const Empty = ({ children }: { children: string }) => (
  <div className="rounded-2xl bg-bg px-3.5 py-4 text-sm text-muted">{children}</div>
);

export function BookTab({ trip, onBack }: { trip: Trip; onBack?: () => void }) {
  const toBook = trip.bookings.filter((b) => b.status === "to_book");
  const booked = trip.bookings.filter((b) => b.status === "booked");
  return (
    <>
      {onBack && <TabHeader trip={trip} onBack={onBack} />}
      <main className="flex flex-col gap-5 px-5 pt-1 pb-8">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">To book</h2>
            {toBook.length > 0 && <span className="text-[13px] font-semibold text-fixed">{toBook.length} left</span>}
          </div>
          {toBook.length === 0 ? (
            <Empty>{trip.bookings.length === 0 ? "None yet." : "All booked."}</Empty>
          ) : (
            <BookingList bookings={toBook} trip={trip} />
          )}
          {booked.length > 0 && (
            <Fold label={`${booked.length} booked`}>
              <BookingList bookings={booked} trip={trip} />
            </Fold>
          )}
        </section>
      </main>
    </>
  );
}

function BookingList({ bookings, trip }: { bookings: Booking[]; trip: Trip }) {
  return (
    <ul className="divide-y divide-divider rounded-2xl bg-bg px-3.5">
      {bookings.map((b) => (
        <li key={b.id} className="flex items-center gap-3 py-3">
          {b.status === "booked" ? (
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-ok text-on-fill">
              <Check size={14} />
            </span>
          ) : (
            <span className="size-[22px] shrink-0 rounded-md border-[1.5px] border-faint" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[15px]">{b.title}</div>
            {b.note && <div className="truncate text-xs text-muted">{b.note}</div>}
          </div>
          {b.estCost != null && <span className="text-[13px] text-muted">~{money(b.estCost, trip.currency)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function MoneyTab({ trip, onBack }: { trip: Trip; onBack?: () => void }) {
  const { members, me } = useHousehold();
  const [adding, setAdding] = useState(false);
  const expenses = trip.expenses ?? [];
  const byCat = spentByCategory(expenses);
  const spent = expenses.reduce((n, e) => n + e.amount, 0);
  const planned = plannedTotal(trip);
  const balance = settle(expenses, members, me);
  const name = (id?: string) => (id === me ? "You" : members.find((m) => m.userId === id)?.name ?? "");
  const lines = [
    ...trip.budget,
    ...Object.keys(byCat)
      .filter((c) => !trip.budget.some((b) => b.category === c))
      .map((c) => ({ category: c, label: c[0].toUpperCase() + c.slice(1), planned: 0 })),
  ];

  return (
    <>
      {onBack && <TabHeader trip={trip} onBack={onBack} />}
      <main className="flex flex-col gap-5 px-5 pt-1 pb-8">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">Money</h2>
            {balance && (
              <span className="text-[13px] text-muted">
                {balance.owesMe > 0
                  ? `${balance.with} owes you ${money(balance.owesMe, trip.currency)}`
                  : balance.owesMe < 0
                    ? `You owe ${balance.with} ${money(-balance.owesMe, trip.currency)}`
                    : `Even with ${balance.with}`}
              </span>
            )}
          </div>
          {lines.length === 0 && expenses.length === 0 ? (
            <Empty>None yet.</Empty>
          ) : (
            <div className="rounded-2xl bg-bg px-3.5 py-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-bold tracking-[-0.02em]">{money(spent, trip.currency)}</span>
                {planned > 0 && <span className="text-sm text-muted">of {money(planned, trip.currency)} planned</span>}
              </div>
              {planned > 0 && (
                <div className="mt-3 h-2 overflow-hidden rounded bg-divider">
                  <div className="h-full bg-ink" style={{ width: `${Math.min(100, (spent / planned) * 100)}%` }} />
                </div>
              )}
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {lines.map((b) => (
                  <li key={b.category} className="flex justify-between">
                    <span>{b.label}</span>
                    <span>
                      <b className="font-semibold">{money(byCat[b.category] ?? 0, trip.currency)}</b>
                      {b.planned > 0 && <span className="text-muted"> / {Math.round(b.planned).toLocaleString("en-GB")}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <button onClick={() => setAdding(true)} className="press h-12 rounded-xl bg-accent text-[16px] font-semibold text-on-fill">
          Add expense
        </button>

        {expenses.length > 0 && (
          <Fold label={`${expenses.length} expenses`}>
            <ul className="divide-y divide-divider rounded-2xl bg-bg px-3.5">
              {[...expenses].reverse().map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{e.note || e.category}</div>
                    <div className="text-xs text-muted">{name(e.paidBy)}</div>
                  </div>
                  <span className="font-semibold">{money(e.amount, trip.currency)}</span>
                  <button onClick={() => deleteExpense(trip.id, e.id)} aria-label={`Delete ${e.note || e.category}`} className="text-xs text-muted">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </Fold>
        )}
      </main>
      <Sheet open={adding} onClose={() => setAdding(false)} label="Add expense">
        <ExpenseForm trip={trip} onDone={() => setAdding(false)} />
      </Sheet>
    </>
  );
}

/** One note row: who, when, where, what. */
export function NoteItem({ note, trip, showWhere = true }: { note: Note; trip: Trip; showWhere?: boolean }) {
  const { members, me } = useHousehold();
  const person = note.authorId === me || !note.authorId ? "You" : members.find((m) => m.userId === note.authorId)?.name ?? "Someone";
  const who = note.via === "claude" ? "Claude" : person;
  const stop = note.stopId ? trip.days.flatMap((d) => d.stops).find((s) => s.id === note.stopId) : undefined;
  const day = note.dayId ? trip.days.find((d) => d.id === note.dayId) : undefined;
  const where = stop ? stop.name : day ? day.title || day.date : undefined;
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: trip.timezone }).format(new Date(note.createdAt));
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          <b className="font-semibold text-ink-2">{who}</b>
          {showWhere && where && ` · ${where}`}
        </span>
        <span className="shrink-0">{when}</span>
      </div>
      <p className="mt-1 text-[15px] leading-snug whitespace-pre-wrap">{note.body}</p>
      {note.authorId === me && note.via !== "claude" && (
        <button onClick={() => deleteNote(trip.id, note.id)} className="mt-1 text-xs text-muted">
          Delete
        </button>
      )}
    </li>
  );
}

export function NotesTab({ trip, onBack }: { trip: Trip; onBack?: () => void }) {
  const notes = trip.notes ?? [];
  return (
    <>
      {onBack && <TabHeader trip={trip} onBack={onBack} />}
      <main className="flex flex-col gap-4 px-5 pt-1 pb-8">
        
        <NoteForm tripId={trip.id} />
        {notes.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-divider rounded-2xl bg-bg px-3.5">
            {notes.map((n) => <NoteItem key={n.id} note={n} trip={trip} />)}
          </ul>
        )}
      </main>
    </>
  );
}
