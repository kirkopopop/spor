"use client";

import { useEffect, useState } from "react";
import type { Stop, Trip } from "@/lib/types";
import { clockTime, dayTab, leaveBy, mapsSearch, money, showTime, travelMinutes } from "@/lib/format";
import { dayStatus, minutesUntil, nowNext, tripClock } from "@/lib/live";
import { spentOn } from "@/lib/money";
import { editStop, useSyncStatus } from "@/lib/store";
import { ChatIcon, Check, Directions, MoneyIcon, NoteIcon, Plus } from "./icons";
import { Sheet } from "./Sheet";
import { ExpenseForm, NoteForm } from "./Forms";

type Modal = { kind: "expense" } | { kind: "note" };

/** Today, during a trip: where you are, what's next, tick as you go. */
export function LiveView({
  trip,
  preview,
  numbers,
  onOpen,
  onAdd,
}: {
  trip: Trip;
  preview?: string | null;
  numbers: Map<string, number>;
  onOpen: (stopId: string) => void;
  onAdd?: () => void; // only for people who can edit
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const clock = tripClock(trip, now, preview);
  const day = trip.days.find((d) => d.date === clock.date);
  const [showEarlier, setShowEarlier] = useState(false);
  const [modal, setModal] = useState<Modal>();
  const sync = useSyncStatus();

  if (!day) return <p className="px-5 pt-2 text-[15px] text-muted">Nothing planned today.</p>;

  const { current, next, nextFixed, earlier } = nowNext(day.stops, clock.time);
  const status = dayStatus(day.stops, clock.time);
  const visible = showEarlier ? day.stops : day.stops.filter((s) => !earlier.includes(s));
  const until = next ? minutesUntil(next.time, clock.time) : 0;
  const leave = next ? leaveBy(next) : undefined;
  const leaveAhead = leave && minutesUntil(leave, clock.time) > 0;
  const spentToday = spentOn(trip.expenses ?? [], day.date, trip.timezone);
  const plannedPerDay = trip.budget.reduce((n, b) => n + b.planned, 0) / Math.max(1, trip.days.length);
  const tick = (s: Stop) => editStop(trip.id, s.id, { doneAt: s.doneAt ? null : new Date().toISOString() });
  const maps = next ? (next.mapsQuery ? mapsSearch(next.mapsQuery) : next.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}` : undefined) : undefined;

  return (
    <div className="px-5 pb-6">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-muted">{[dayTab(day.date), day.title || day.place].filter(Boolean).join(" · ")}</span>
        <span role="status" className={`flex items-center gap-1.5 ${sync.online && !sync.pending ? "text-ok" : "text-muted"}`}>
          <span className={`size-1.5 rounded-full ${sync.online && !sync.pending ? "bg-ok" : "bg-faint"}`} />
          {!sync.online ? `Offline${sync.pending ? ` · ${sync.pending} to sync` : ""}` : sync.pending ? "Syncing…" : "Synced"}
        </span>
      </div>

      <section aria-label="Next" className="mt-3 rounded-[20px] bg-bg p-4">
        {status === "next" && current && <p className="truncate text-[14px] text-muted">Now · {current.name}</p>}
        {status === "empty" ? (
          <>
            <p className="text-[17px] font-semibold">Nothing planned today</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onAdd && (
                <button onClick={onAdd} className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-on-fill">
                  <Plus size={17} />
                  Add stop
                </button>
              )}
              <a
                href={`https://claude.ai/new?q=${encodeURIComponent(`In tur, plan today on ${trip.name}: ${dayTab(day.date)} (${day.date}). Nothing is planned yet.`)}`}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[15px] font-medium text-ink-2"
              >
                <ChatIcon size={17} />
                Ask Claude
              </a>
            </div>
          </>
        ) : status === "last" && current ? (
          <button onClick={() => onOpen(current.id)} className="block w-full min-w-0 text-left">
            <span className="block text-[14px] text-muted">Now</span>
            <span className="mt-0.5 block text-[19px] leading-snug font-semibold tracking-[-0.01em]">{current.name}</span>
          </button>
        ) : next ? (
          <div className="mt-2 flex items-center gap-4">
            <button onClick={() => onOpen(next.id)} className="min-w-0 flex-1 text-left">
              <div className="tnum flex items-baseline gap-2">
                <span className={`text-[34px] leading-none font-semibold tracking-[-0.03em] ${next.kind === "fixed" ? "text-fixed" : "text-ink"}`}>
                  {clockTime(next.time)}
                </span>
                <span className="text-[15px] text-ink-2">in {travelMinutes(Math.max(0, until))}</span>
              </div>
              <div className="mt-1.5 text-[19px] leading-snug font-semibold tracking-[-0.01em]">{next.name}</div>
              {leaveAhead && <div className="tnum mt-1 text-[14px] font-medium text-fixed">Leave by {clockTime(leave!)}</div>}
            </button>
            {maps && (
              <a href={maps} target="_blank" rel="noreferrer" aria-label={`Directions to ${next.name}`} className="press flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-fill shadow-[var(--shadow-float)]">
                <Directions size={21} />
              </a>
            )}
          </div>
        ) : (
          <p className="mt-1 text-[17px] font-semibold">Done for today.</p>
        )}
        {nextFixed && <p className="tnum mt-3 border-t border-line pt-3 text-[14px] text-muted">Then fixed · {clockTime(nextFixed.time)} {nextFixed.name}</p>}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setModal({ kind: "expense" })} className="press flex h-12 items-center justify-center gap-2 rounded-xl bg-soft text-[15px] font-medium">
          <MoneyIcon size={18} />
          Expense
        </button>
        <button onClick={() => setModal({ kind: "note" })} className="press flex h-12 items-center justify-center gap-2 rounded-xl bg-soft text-[15px] font-medium">
          <NoteIcon size={18} />
          Note
        </button>
      </div>

      {earlier.length > 0 && (
        <button onClick={() => setShowEarlier((v) => !v)} className="press mt-4 py-1 text-[14px] font-medium text-accent">
          {showEarlier ? "Hide earlier stops" : `Show ${earlier.length} earlier stop${earlier.length > 1 ? "s" : ""}`}
        </button>
      )}
      <ol className="mt-2">
        {visible.map((s) => {
          const isCurrent = s.id === current?.id;
          return (
            <li key={s.id} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${isCurrent ? "-mx-2 bg-accent-soft px-4" : ""}`}>
              <span
                className={`tnum flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                  isCurrent ? "bg-accent text-on-fill" : s.kind === "fixed" ? "bg-fixed-soft text-fixed" : "bg-card text-accent-ink"
                }`}
              >
                {numbers.get(s.id) ?? ""}
              </span>
              <button onClick={() => onOpen(s.id)} className="min-w-0 flex-1 text-left">
                <span className={`block text-[16px] leading-snug ${isCurrent ? "font-semibold" : ""} ${s.doneAt || s.kind === "optional" ? "text-muted" : ""}`}>{s.name}</span>
                <span className={`tnum block text-[14px] ${s.kind === "fixed" ? "font-semibold text-fixed" : "text-muted"}`}>{showTime(s)}</span>
              </button>
              <button
                onClick={() => tick(s)}
                aria-label={s.doneAt ? `Untick ${s.name}` : `Tick ${s.name}`}
                aria-pressed={!!s.doneAt}
                className={`press flex size-11 shrink-0 items-center justify-center rounded-full`}
              >
                <span className={`flex size-[26px] items-center justify-center rounded-full border-2 ${s.doneAt ? "border-ok bg-ok text-on-fill" : s.kind === "optional" ? "border-dashed border-faint" : "border-faint"}`}>
                  {s.doneAt && <Check size={14} />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="tnum mt-4 flex justify-between rounded-xl bg-bg px-4 py-3 text-[14px] text-ink-2">
        <span>Spent today</span>
        <span>
          <b className="font-semibold text-ink">{money(spentToday, trip.currency)}</b>
          {plannedPerDay > 0 && ` of ${money(plannedPerDay, trip.currency)}`}
        </span>
      </div>

      <Sheet open={!!modal} onClose={() => setModal(undefined)} label={modal?.kind === "note" ? "Note" : "Expense"}>
        {modal?.kind === "expense" && <ExpenseForm trip={trip} stopId={current?.id} onDone={() => window.history.back()} />}
        {modal?.kind === "note" && (
          <div className="flex flex-col gap-3 pr-10">
            <h3 className="text-[22px] font-bold tracking-[-0.02em]">Note</h3>
            <NoteForm tripId={trip.id} stopId={current?.id} dayId={current ? undefined : day.id} onDone={() => window.history.back()} />
          </div>
        )}
      </Sheet>
    </div>
  );
}
