"use client";

import { useState } from "react";
import type { Booking, Day, Stop, Trip } from "@/lib/types";
import { clockTime, dayTab, leaveBy, MODE_LABEL, showTime, travelMinutes } from "@/lib/format";
import { ChatIcon, Check, Chevron, Mode, Plus, RainIcon } from "../icons";
import { NoteItem } from "../TripTabs";

/** The Plan tab: day pills, then the day as numbered stops matching the map's pins. */
export function DayPlan({
  trip,
  day,
  numbers,
  selectedId,
  onDay,
  onOpen,
  onAdd,
  onRain,
}: {
  trip: Trip;
  day?: Day;
  numbers: Map<string, number>;
  selectedId?: string;
  onDay: (d: Day) => void;
  onOpen: (stopId: string) => void;
  onAdd: () => void;
  onRain: () => void;
}) {
  const bookings = new Map(trip.bookings.map((b) => [b.id, b]));
  const dayNotes = (trip.notes ?? []).filter((n) => n.dayId === day?.id);

  // A container, not the viewport, decides the row shape: the same list is a phone sheet or a laptop panel.
  return (
    <div className="@container pb-6">
      {trip.days.length > 0 && (
        <div className="sticky top-0 z-10 bg-card/95 px-5 pt-1 pb-3 backdrop-blur" role="tablist" aria-label="Days">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
            {trip.days.map((d) => {
              const on = d.id === day?.id;
              return (
                <button
                  key={d.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => onDay(d)}
                  className={`press flex shrink-0 flex-col items-start rounded-2xl px-3.5 py-2 text-left ${on ? "bg-ink text-on-ink" : "bg-soft text-ink"}`}
                >
                  <span className="text-[14px] font-semibold">{dayTab(d.date)}</span>
                  <span className={`max-w-28 truncate text-[12px] ${on ? "text-on-ink/80" : "text-ink-2"}`}>{shortPlace(d.place) || "—"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {day ? (
        <div className="px-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[20px] leading-snug font-bold tracking-[-0.02em] text-balance">{day.title || dayTab(day.date)}</h3>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {day.rain.length > 0 && (
              <button onClick={onRain} className="press inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-[14px] text-ink-2">
                <RainIcon size={16} />
                If it rains
              </button>
            )}
            <a
              href={`https://claude.ai/new?q=${encodeURIComponent(`In tur, look at ${trip.name} on ${dayTab(day.date)} (${day.date}${day.title ? `, "${day.title}"` : ""}). `)}`}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-[14px] text-ink-2"
            >
              <ChatIcon size={16} />
              Ask Claude
            </a>
          </div>

          {day.stops.length === 0 ? (
            <p className="mt-6 text-[15px] text-muted">None yet.</p>
          ) : (
            <ol className="mt-4 @min-[560px]:mt-3 @min-[560px]:divide-y @min-[560px]:divide-divider">
              {day.stops.map((s, i) => (
                <li key={s.id}>
                  {s.go && (
                    <div className="@min-[560px]:hidden">
                      <TravelLine stop={s} first={i === 0} />
                    </div>
                  )}
                  <StopRow stop={s} n={numbers.get(s.id) ?? i + 1} booking={s.bookingId ? bookings.get(s.bookingId) : undefined} selected={s.id === selectedId} onOpen={onOpen} />
                </li>
              ))}
            </ol>
          )}

          <button onClick={onAdd} className="press mt-3 inline-flex items-center gap-1.5 py-2 text-[15px] font-medium text-accent">
            <Plus size={17} />
            Add stop
          </button>

          {dayNotes.length > 0 && (
            <section className="mt-4">
              <h4 className="mb-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Notes</h4>
              <ul className="divide-y divide-divider">
                {dayNotes.map((n) => <NoteItem key={n.id} note={n} trip={trip} showWhere={false} />)}
              </ul>
            </section>
          )}
          <SpareIdeas trip={trip} day={day} />
        </div>
      ) : (
        <p className="px-5 pt-2 text-[15px] text-muted">No days yet.</p>
      )}
    </div>
  );
}

const shortPlace = (p: string) => p.split("→").at(-1)!.trim();

function StopRow({
  stop,
  n,
  booking,
  selected,
  onOpen,
}: {
  stop: Stop;
  n: number;
  booking?: Booking;
  selected?: boolean;
  onOpen: (id: string) => void;
}) {
  const fixed = stop.kind === "fixed";
  const optional = stop.kind === "optional";
  const picked = stop.options?.find((o) => o.id === stop.pickedOptionId);
  const leave = stop.go && fixed ? leaveBy(stop) : undefined;
  const status = booking?.status === "to_book" || stop.pickOne;
  return (
    <button
      onClick={() => onOpen(stop.id)}
      aria-current={selected || undefined}
      className={`press -mx-2 flex w-[calc(100%+16px)] items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition-colors @min-[560px]:gap-3 @min-[560px]:py-2 ${
        selected ? "bg-accent-soft" : "@min-[560px]:hover:bg-bg"
      }`}
    >
      {/* Wide: time leads the row, like an itinerary. */}
      <span className={`tnum hidden w-12 shrink-0 text-[14px] @min-[560px]:block ${fixed ? "font-semibold text-fixed" : "text-ink-2"}`}>
        {showTime(stop)}
      </span>
      <span
        className={`tnum flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
          stop.doneAt ? "bg-ok text-on-fill" : fixed ? "bg-fixed-soft text-fixed" : "bg-accent-soft text-accent-ink"
        } ${optional && !stop.doneAt ? "outline-[1.5px] outline-dashed outline-faint bg-card text-muted" : ""}`}
      >
        {stop.doneAt ? <Check size={14} /> : n}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] leading-snug ${optional ? "text-muted" : "text-ink"}`}>
          {stop.name}
          {booking?.status === "booked" && <Check size={15} className="ml-1.5 inline-block align-[-2px] text-ok" aria-label="Booked" />}
        </span>
        <span className={`tnum mt-0.5 block text-[14px] ${status ? "" : "@min-[560px]:hidden"}`}>
          <span className={`@min-[560px]:hidden ${fixed ? "font-semibold text-fixed" : "text-muted"}`}>{showTime(stop)}</span>
          {booking?.status === "to_book" && <span className="ml-2 font-semibold text-fixed @min-[560px]:ml-0">To book</span>}
          {stop.pickOne &&
            (picked ? (
              <span className="ml-2 text-ink-2 @min-[560px]:ml-0">{picked.name}</span>
            ) : (
              <span className="ml-2 font-semibold text-accent @min-[560px]:ml-0">Pick one</span>
            ))}
        </span>
      </span>
      {/* Wide: how you get here, in its own column instead of a line between rows. */}
      {stop.go && (
        <span className="tnum hidden shrink-0 items-center gap-1.5 text-[13px] text-muted @min-[560px]:flex">
          <Mode mode={stop.go.mode} size={15} />
          {stop.go.est ? "~" : ""}
          {travelMinutes(stop.go.min)}
          {leave && <span className="font-medium text-fixed">· leave {clockTime(leave)}</span>}
        </span>
      )}
    </button>
  );
}

/** One quiet line between stops; leave-by only before a fixed stop. */
function TravelLine({ stop, first }: { stop: Stop; first: boolean }) {
  const go = stop.go!;
  const leave = stop.kind === "fixed" ? leaveBy(stop) : undefined;
  return (
    <div className={`flex items-center gap-2 pl-[11px] text-[13px] text-muted ${first ? "" : ""}`}>
      <span className="flex h-5 w-[5px] justify-center">
        <span className="h-full w-[2px] rounded-full bg-divider" />
      </span>
      <Mode mode={go.mode} size={15} className="ml-2.5" />
      <span className="tnum">
        {MODE_LABEL[go.mode] ?? go.mode} · {go.est ? "~" : ""}
        {travelMinutes(go.min)}
        {leave && <span className="font-medium text-fixed"> · leave by {clockTime(leave)}</span>}
      </span>
    </div>
  );
}

function SpareIdeas({ trip, day }: { trip: Trip; day: Day }) {
  const [open, setOpen] = useState(false);
  const ideas = trip.spare.filter((s) => s.city === day.city);
  if (ideas.length === 0) return null;
  return (
    <section className="mt-5 border-t border-divider pt-2">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press flex w-full items-center justify-between py-2.5 text-[15px] font-medium">
        <span>Spare time · {ideas.length} ideas</span>
        <Chevron size={17} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-divider">
          {ideas.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[16px]">{s.name}</span>
                <span className="tnum shrink-0 text-[13px] text-muted">
                  {s.indoor ? "Indoors" : "Outdoors"} · {travelMinutes(s.minutes)}
                </span>
              </div>
              {s.note && <p className="mt-0.5 text-[14px] text-muted">{s.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
