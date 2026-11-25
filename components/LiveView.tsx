"use client";

import { useEffect, useState } from "react";
import type { Stop, Trip } from "@/lib/types";
import { dayTab, leaveBy, mapsSearch, money, showTime, travelMinutes } from "@/lib/format";
import { minutesUntil, nowNext, tripClock } from "@/lib/live";
import { spentOn } from "@/lib/money";
import { editStop, useSyncStatus } from "@/lib/store";
import { Check, Directions } from "./icons";
import { Sheet } from "./Sheet";
import { StopDetail } from "./StopDetail";
import { ExpenseForm, NoteForm, StopForm } from "./Forms";

type SheetState = { kind: "stop"; stopId: string } | { kind: "edit"; stopId: string } | { kind: "expense" } | { kind: "note" };

/** The Today tab during a trip: where you are, what's next, tick as you go. */
export function LiveView({ trip, preview }: { trip: Trip; preview?: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const clock = tripClock(trip, now, preview);
  const day = trip.days.find((d) => d.date === clock.date);
  const [showEarlier, setShowEarlier] = useState(false);
  const [sheet, setSheet] = useState<SheetState>();
  const sync = useSyncStatus();

  if (!day) {
    return <main className="flex-1 px-5 pt-14 text-sm text-muted">None yet.</main>;
  }

  const { current, next, nextFixed, earlier } = nowNext(day.stops, clock.time);
  const visible = showEarlier ? day.stops : day.stops.filter((s) => !earlier.includes(s));
  const until = next ? minutesUntil(next.time, clock.time) : 0;
  const leave = next ? leaveBy(next) : undefined;
  const leaveAhead = leave && minutesUntil(leave, clock.time) > 0;
  const spentToday = spentOn(trip.expenses ?? [], day.date, trip.timezone);
  const plannedPerDay = trip.budget.reduce((n, b) => n + b.planned, 0) / Math.max(1, trip.days.length);
  const notesToday = (trip.notes ?? []).filter((n) => n.dayId === day.id || day.stops.some((s) => s.id === n.stopId)).length;
  const allStops = trip.days.flatMap((d) => d.stops);
  const sheetStop = sheet && "stopId" in sheet ? allStops.find((s) => s.id === sheet.stopId) : undefined;
  const tick = (s: Stop) => editStop(trip.id, s.id, { doneAt: s.doneAt ? null : new Date().toISOString() });

  return (
    <>
      <div className="px-5 pt-13">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-[22px] leading-tight font-bold tracking-[-0.02em]">
            {trip.name} <span className="text-[15px] font-medium text-muted">· {dayTab(day.date)}</span>
          </h1>
          <SyncDot online={sync.online} pending={sync.pending} />
        </div>

        <section className="mt-4 rounded-[20px] border border-line bg-card p-4" aria-label="Now and next">
          {current && <div className="text-[13px] text-muted">Now · {current.name}</div>}
          {next ? (
            <div className="mt-2.5 flex items-center gap-3">
              <button onClick={() => setSheet({ kind: "stop", stopId: next.id })} className="min-w-0 flex-1 text-left">
                <div className="text-[13px] font-semibold text-accent-ink">
                  {showTime(next)} · in {travelMinutes(Math.max(0, until))}
                  {leaveAhead && ` · leave by ${leave}`}
                </div>
                <div className="mt-0.5 text-xl leading-tight font-bold tracking-[-0.02em]">{next.name}</div>
              </button>
              {(next.mapsQuery || next.lat != null) && (
                <a
                  href={next.mapsQuery ? mapsSearch(next.mapsQuery) : `https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Directions to ${next.name}`}
                  className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white"
                >
                  <Directions size={20} />
                </a>
              )}
            </div>
          ) : (
            <div className="mt-1 text-[15px] text-ink-2">Done for today.</div>
          )}
          {nextFixed && (
            <div className="mt-2.5 text-[13px] text-muted">
              Fixed · {nextFixed.time} {nextFixed.name}
            </div>
          )}
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setSheet({ kind: "expense" })} className="press rounded-[14px] border border-line bg-card py-3 text-[13px]">
            Expense
          </button>
          <button onClick={() => setSheet({ kind: "note" })} className="press rounded-[14px] border border-line bg-card py-3 text-[13px]">
            Note
          </button>
        </div>
      </div>

      <main className="flex-1 px-5 pt-4 pb-6">
        {earlier.length > 0 && (
          <button onClick={() => setShowEarlier((v) => !v)} className="px-1 pb-2 text-[13px] text-muted">
            {showEarlier ? "Hide earlier stops" : `Show ${earlier.length} earlier stop${earlier.length > 1 ? "s" : ""}`}
          </button>
        )}
        <ol className="rounded-[18px] border border-line bg-card py-1 pr-3.5">
          {visible.map((s, i) => {
            const isCurrent = s.id === current?.id;
            return (
              <li key={s.id} className={`flex items-center gap-3 border-l-[3px] py-[11px] pl-[11px] ${isCurrent ? "border-accent" : "border-transparent"} ${i > 0 ? "border-t border-t-divider" : ""}`}>
                <button onClick={() => setSheet({ kind: "stop", stopId: s.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className={`w-11 shrink-0 text-sm tabular-nums ${s.kind === "fixed" ? "font-semibold text-accent-ink" : isCurrent ? "font-semibold" : "font-medium"}`}>
                    {showTime(s)}
                  </span>
                  <span className={`flex-1 text-[15px] leading-snug ${isCurrent ? "font-semibold" : ""} ${s.kind === "optional" || s.doneAt ? "text-muted" : ""}`}>
                    {s.name}
                  </span>
                </button>
                <button
                  onClick={() => tick(s)}
                  aria-label={s.doneAt ? `Untick ${s.name}` : `Tick ${s.name}`}
                  aria-pressed={!!s.doneAt}
                  className={`press flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                    s.doneAt ? "border-ok bg-ok text-white" : s.kind === "optional" ? "border-dashed border-faint" : "border-faint"
                  }`}
                >
                  {s.doneAt && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3.5 flex justify-between rounded-[14px] bg-soft px-3.5 py-3 text-[13px] text-ink-2">
          <span>Today so far</span>
          <span>
            <b className="text-ink">{money(spentToday, trip.currency)}</b>
            {plannedPerDay > 0 && ` of ${money(plannedPerDay, trip.currency)}`}
            {notesToday > 0 && ` · ${notesToday} note${notesToday > 1 ? "s" : ""}`}
          </span>
        </div>
      </main>

      <Sheet open={!!sheet} onClose={() => setSheet(undefined)} label="Today">
        {sheet?.kind === "stop" && sheetStop && (
          <StopDetail
            trip={trip}
            stop={sheetStop}
            booking={sheetStop.bookingId ? trip.bookings.find((b) => b.id === sheetStop.bookingId) : undefined}
            onShift={(time) => editStop(trip.id, sheetStop.id, { time })}
            onPick={(pickedOptionId) => editStop(trip.id, sheetStop.id, { pickedOptionId })}
            onEdit={() => setSheet({ kind: "edit", stopId: sheetStop.id })}
          />
        )}
        {sheet?.kind === "edit" && sheetStop && (
          <StopForm trip={trip} day={day} stop={sheetStop} onDone={() => window.history.back()} />
        )}
        {sheet?.kind === "expense" && <ExpenseForm trip={trip} stopId={current?.id} onDone={() => window.history.back()} />}
        {sheet?.kind === "note" && (
          <div className="flex flex-col gap-3 pr-10">
            <h3 className="text-xl font-bold tracking-[-0.02em]">Note</h3>
            <NoteForm tripId={trip.id} stopId={current?.id} dayId={current ? undefined : day.id} onDone={() => window.history.back()} />
          </div>
        )}
      </Sheet>
    </>
  );
}

function SyncDot({ online, pending }: { online: boolean; pending: number }) {
  const label = !online ? `Offline${pending ? ` · ${pending} to sync` : ""}` : pending ? "Syncing…" : "Live · synced";
  return (
    <div className={`flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap ${online && !pending ? "text-ok" : "text-muted"}`} role="status">
      <span className={`size-1.5 rounded-full ${online && !pending ? "bg-ok" : "bg-faint"}`} />
      {label}
    </div>
  );
}
