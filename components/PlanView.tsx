"use client";

import { useState } from "react";
import type { Booking, Day, Stop, Trip } from "@/lib/types";
import { dateRange, dayRouteUrl, dayTab, leaveBy, MODE_LABEL, showTime, todayIn, travelMinutes } from "@/lib/format";
import { editStop } from "@/lib/store";
import { useUrlParam } from "@/lib/useUrlParam";
import { BackButton, StageIndicator } from "./TripHeader";
import { Chevron, Mode } from "./icons";
import { Sheet } from "./Sheet";
import { StopDetail } from "./StopDetail";

export function PlanView({ trip }: { trip: Trip }) {
  // The day is in the address (?day=2026-12-22) so a shared link or reload lands on it.
  const [dayParam, setDayParam] = useUrlParam("day", "replace");
  const today = todayIn(trip.timezone);
  const day =
    trip.days.find((d) => d.date === dayParam) ?? trip.days.find((d) => d.date === today) ?? trip.days[0];
  const [openStopId, setOpenStopId] = useState<string>();
  const [rainOpen, setRainOpen] = useState(false);

  const stops = day?.stops ?? [];
  const openStop = stops.find((s) => s.id === openStopId);
  const bookings = new Map(trip.bookings.map((b) => [b.id, b]));

  const selectDay = (d: Day) => setDayParam(d.date);

  return (
    <>
      <div className="px-5 pt-13">
        <div className="flex items-center justify-between">
          <BackButton href="/" label="Back to trips" />
          <StageIndicator stage={trip.stage} />
        </div>
        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">{trip.name}</h1>
        <div className="mt-0.5 text-sm text-ink-2">
          {dateRange(trip.startDate, trip.endDate)} · {trip.people.join(", ")}
        </div>

        {trip.days.length > 0 && (
          <div
            className="mt-4 grid gap-1 rounded-[14px] bg-soft p-1"
            style={{ gridTemplateColumns: `repeat(${trip.days.length}, minmax(0, 1fr))` }}
            role="tablist"
          >
            {trip.days.map((d) => {
              const on = d.id === day?.id;
              return (
                <button
                  key={d.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => selectDay(d)}
                  className={`flex flex-col items-center gap-px rounded-[10px] py-[7px] ${on ? "bg-card" : ""}`}
                >
                  <span className={`text-[13px] ${on ? "font-semibold" : "font-medium"}`}>{dayTab(d.date)}</span>
                  <span className="max-w-full truncate px-1 text-[11px] text-muted">{shortPlace(d.place)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {day && (
        <main className="flex-1 px-5 pt-5 pb-6">
          <div className="flex items-baseline justify-between gap-4 px-0.5">
            <h2 className="text-[17px] leading-snug font-semibold">{day.title || dayTab(day.date)}</h2>
            <div className="flex shrink-0 gap-3.5 text-[13px] text-ink-2">
              {dayRouteUrl(day) && (
                <a href={dayRouteUrl(day)} target="_blank" rel="noreferrer">
                  Map
                </a>
              )}
              {day.rain.length > 0 && <button onClick={() => setRainOpen(true)}>If it rains</button>}
            </div>
          </div>

          <Timeline stops={stops} bookings={bookings} onOpen={setOpenStopId} />
          <SpareIdeas trip={trip} day={day} />
        </main>
      )}

      <Sheet open={!!openStop} onClose={() => setOpenStopId(undefined)} label={openStop?.name ?? ""}>
        {openStop && (
          <StopDetail
            stop={openStop}
            booking={openStop.bookingId ? bookings.get(openStop.bookingId) : undefined}
            onShift={(time) => editStop(trip.id, openStop.id, { time })}
            onPick={(pickedOptionId) => editStop(trip.id, openStop.id, { pickedOptionId })}
          />
        )}
      </Sheet>

      <Sheet open={rainOpen} onClose={() => setRainOpen(false)} label="If it rains">
        <h3 className="text-xl font-bold tracking-[-0.02em]">If it rains</h3>
        <ul className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2">
          {day?.rain.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Sheet>
    </>
  );
}

// "London → Edinburgh → Glasgow" fits a tab as "Glasgow".
const shortPlace = (p: string) => p.split("→").at(-1)!.trim();

function Timeline({
  stops,
  bookings,
  onOpen,
}: {
  stops: Stop[];
  bookings: Map<string, Booking>;
  onOpen: (id: string) => void;
}) {
  if (stops.length === 0) {
    return <div className="mt-2 rounded-[18px] border border-line bg-card px-3.5 py-4 text-sm text-muted">None yet.</div>;
  }
  return (
    <ol className="mt-2 rounded-[18px] border border-line bg-card px-3.5 py-1">
      {stops.map((s, i) => (
        <li key={s.id}>
          {/* The first stop's travel is the trip from where you slept: often the day's key leave-by. */}
          {s.go && <TravelLine stop={s} first={i === 0} />}
          <button
            onClick={() => onOpen(s.id)}
            className={`flex w-full items-center gap-3 py-[11px] text-left ${
              i > 0 ? `border-t border-divider ${s.go ? "mt-2" : ""}` : ""
            }`}
          >
            <span
              className={`w-11 shrink-0 text-sm tabular-nums ${
                s.kind === "fixed" ? "font-semibold text-accent-ink" : "font-medium"
              }`}
            >
              {showTime(s)}
            </span>
            <span className={`flex-1 text-[15px] leading-snug ${s.kind === "optional" ? "text-muted" : ""}`}>
              {s.name}
              <BookedMark stop={s} bookings={bookings} />
            </span>
            <Status stop={s} bookings={bookings} />
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One quiet line: icon + minutes. Leave-by only before a fixed stop. */
function TravelLine({ stop, first }: { stop: Stop; first: boolean }) {
  const go = stop.go!;
  const leave = stop.kind === "fixed" ? leaveBy(stop) : undefined;
  return (
    <div className={`flex items-center gap-2 pl-14 text-xs text-muted ${first ? "pt-3" : ""}`}>
      <Mode mode={go.mode} size={14} />
      <span>
        {MODE_LABEL[go.mode] ?? go.mode} · {go.est ? "~" : ""}
        {travelMinutes(go.min)}
        {leave && <span className="font-medium text-accent-ink"> · leave by {leave}</span>}
      </span>
    </div>
  );
}

function BookedMark({ stop, bookings }: { stop: Stop; bookings: Map<string, Booking> }) {
  const b = stop.bookingId ? bookings.get(stop.bookingId) : undefined;
  if (b?.status !== "booked") return null;
  return <span className="ml-1.5 text-[13px] text-ok">✓</span>;
}

/** The only status words: "To book", "Pick one", or the picked option's name. */
function Status({ stop, bookings }: { stop: Stop; bookings: Map<string, Booking> }) {
  const b = stop.bookingId ? bookings.get(stop.bookingId) : undefined;
  if (b?.status === "to_book") return <span className="text-xs font-semibold text-accent-ink">To book</span>;
  if (stop.pickOne) {
    const picked = stop.options?.find((o) => o.id === stop.pickedOptionId);
    return picked ? (
      <span className="max-w-24 truncate text-xs text-ink-2">{picked.name}</span>
    ) : (
      <span className="text-xs font-semibold text-accent-ink">Pick one</span>
    );
  }
  return null;
}

function SpareIdeas({ trip, day }: { trip: Trip; day: Day }) {
  const [open, setOpen] = useState(false);
  const ideas = trip.spare.filter((s) => s.city === day.city);
  if (ideas.length === 0) return null;
  return (
    <section className="mt-3.5">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-1 py-1 text-sm"
      >
        <span>Spare time · {ideas.length} ideas</span>
        <Chevron size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-divider rounded-[18px] border border-line bg-card px-3.5">
          {ideas.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px]">{s.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {s.indoor ? "Indoors" : "Outdoors"} · {travelMinutes(s.minutes)}
                </span>
              </div>
              {s.note && <p className="mt-0.5 text-[13px] text-muted">{s.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
