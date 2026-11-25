"use client";

import { money, plannedTotal } from "@/lib/format";
import type { Booking, Trip } from "@/lib/types";
import { Back, Check } from "./icons";
import { Fold } from "./Fold";

function TabHeader({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-13">
      <button
        onClick={onBack}
        aria-label="Back to plan"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-card"
      >
        <Back size={18} />
      </button>
      <h1 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{trip.name}</h1>
    </header>
  );
}

const Empty = ({ children }: { children: string }) => (
  <div className="rounded-[18px] border border-line bg-card px-3.5 py-4 text-sm text-muted">{children}</div>
);

export function BookTab({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const toBook = trip.bookings.filter((b) => b.status === "to_book");
  const booked = trip.bookings.filter((b) => b.status === "booked");
  return (
    <>
      <TabHeader trip={trip} onBack={onBack} />
      <main className="flex flex-1 flex-col gap-5 px-5 pt-5 pb-6">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">To book</h2>
            {toBook.length > 0 && <span className="text-[13px] font-semibold text-accent-ink">{toBook.length} left</span>}
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
    <ul className="divide-y divide-divider rounded-[18px] border border-line bg-card px-3.5">
      {bookings.map((b) => (
        <li key={b.id} className="flex items-center gap-3 py-3">
          {b.status === "booked" ? (
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-ok text-white">
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

export function MoneyTab({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  // Expenses arrive with Supabase; until then everything is planned, nothing spent.
  const spent = 0;
  const planned = plannedTotal(trip);
  // TODO(auth): "split with" names the other household member, not a hard-coded traveller.
  const others = trip.people.filter((p) => p !== "Kirill");
  return (
    <>
      <TabHeader trip={trip} onBack={onBack} />
      <main className="flex-1 px-5 pt-5 pb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Money</h2>
          {others.length > 0 && <span className="text-[13px] text-muted">split with {others[0]}</span>}
        </div>
        {trip.budget.length === 0 ? (
          <Empty>None yet.</Empty>
        ) : (
          <div className="rounded-[18px] border border-line bg-card px-3.5 py-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold tracking-[-0.02em]">{money(spent, trip.currency)}</span>
              <span className="text-sm text-muted">of {money(planned, trip.currency)} planned</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-divider">
              <div className="h-full bg-ink" style={{ width: `${planned ? Math.min(100, (spent / planned) * 100) : 0}%` }} />
            </div>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {trip.budget.map((b) => (
                <li key={b.category} className="flex justify-between">
                  <span>{b.label}</span>
                  <span>
                    <b className="font-semibold">{money(0, trip.currency)}</b>{" "}
                    <span className="text-muted">/ {Math.round(b.planned).toLocaleString("en-GB")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}

export function NotesTab({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  return (
    <>
      <TabHeader trip={trip} onBack={onBack} />
      <main className="flex-1 px-5 pt-5 pb-6">
        <h2 className="mb-2 text-[15px] font-semibold">Notes</h2>
        <p className="text-sm text-muted">None yet.</p>
      </main>
    </>
  );
}
