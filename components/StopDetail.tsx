"use client";

import type { Booking, Stop, Trip } from "@/lib/types";
import { NoteForm } from "./Forms";
import { NoteItem } from "./TripTabs";
import { leaveBy, mapsSearch, MODE_LABEL, shiftTime, showTime, travelMinutes } from "@/lib/format";
import { Check, Directions, Mode } from "./icons";
import { RichText } from "./RichText";

/** The sheet answers "how and what if"; the list already said "what and when". */
export function StopDetail({
  trip,
  stop,
  booking,
  onShift,
  onPick,
  onEdit,
}: {
  trip: Trip;
  stop: Stop;
  booking?: Booking;
  onShift: (time: string) => void;
  onPick: (optionId: string) => void;
  onEdit: () => void;
}) {
  const notes = (trip.notes ?? []).filter((n) => n.stopId === stop.id);
  const leave = leaveBy(stop);
  const maps = stop.mapsQuery
    ? mapsSearch(stop.mapsQuery)
    : stop.lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
      : undefined;

  return (
    <article className="pr-10">
      <div className={`text-sm tabular-nums ${stop.kind === "fixed" ? "font-semibold text-accent-ink" : "text-muted"}`}>
        {showTime(stop)}
        {stop.kind === "fixed" && " · Fixed"}
        {stop.kind === "optional" && " · Optional"}
      </div>
      <h3 className="mt-1 text-[22px] leading-tight font-bold tracking-[-0.02em]">{stop.name}</h3>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {booking && (
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              booking.status === "booked" ? "bg-[#E6F0EA] text-ok" : "bg-accent-soft text-accent-ink"
            }`}
          >
            {booking.status === "booked" ? "Booked" : "To book"}
          </span>
        )}
        {stop.fee && <span className="rounded-full bg-divider px-2.5 py-1 text-ink-2">{stop.fee.label}</span>}
        {stop.who && <span className="rounded-full bg-divider px-2.5 py-1 text-ink-2">{stop.who}</span>}
      </div>

      {stop.go && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-bg p-3.5 text-sm">
          <Mode mode={stop.go.mode} size={18} className="mt-0.5 shrink-0 text-ink-2" />
          <div>
            <div className="font-medium">
              {MODE_LABEL[stop.go.mode] ?? stop.go.mode} · {stop.go.est ? "~" : ""}
              {travelMinutes(stop.go.min)}
              {leave && <span className="text-accent-ink"> · leave by {leave}</span>}
            </div>
            {stop.go.text && <p className="mt-0.5 text-ink-2">{stop.go.text}</p>}
          </div>
        </div>
      )}

      {stop.body && <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{stop.body}</p>}

      {stop.options && stop.options.length > 0 && (
        <section className="mt-4">
          {stop.pickOne && <h4 className="mb-2 text-xs font-semibold text-accent-ink">Pick one</h4>}
          <ul className="divide-y divide-divider rounded-2xl border border-line">
            {stop.options.map((o) => {
              const picked = o.id === stop.pickedOptionId;
              const inner = (
                <>
                  {stop.pickOne && (
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                        picked ? "border-ink bg-ink text-white" : "border-faint"
                      }`}
                    >
                      {picked && <Check size={12} />}
                    </span>
                  )}
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium">{o.name}</span>
                    {o.body && <span className="mt-0.5 block text-[13px] text-muted">{o.body}</span>}
                  </span>
                </>
              );
              return (
                <li key={o.id}>
                  {stop.pickOne ? (
                    <button onClick={() => onPick(o.id)} className="flex w-full gap-3 px-3.5 py-3 text-left">
                      {inner}
                    </button>
                  ) : (
                    <a
                      href={o.mapsQuery ? mapsSearch(o.mapsQuery) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-3 px-3.5 py-3"
                    >
                      {inner}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {stop.more && (
        <section className="mt-4 rounded-2xl bg-bg p-3.5 text-sm leading-relaxed text-ink-2">
          <RichText text={stop.more} />
        </section>
      )}

      <section className="mt-4">
        {notes.length > 0 && (
          <ul className="mb-2 divide-y divide-divider rounded-2xl border border-line px-3.5">
            {notes.map((n) => <NoteItem key={n.id} note={n} trip={trip} showWhere={false} />)}
          </ul>
        )}
        <NoteForm tripId={trip.id} stopId={stop.id} compact />
      </section>

      <div className="mt-5 flex gap-2">
        {maps && (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-ink py-3 text-sm font-semibold text-white"
          >
            <Directions size={16} />
            Google Maps
          </a>
        )}
        <button
          onClick={() => onShift(shiftTime(stop.time, -15))}
          className="rounded-[14px] border border-line px-4 py-3 text-sm"
        >
          Earlier
        </button>
        <button
          onClick={() => onShift(shiftTime(stop.time, 15))}
          className="rounded-[14px] border border-line px-4 py-3 text-sm"
        >
          Later
        </button>
      </div>
      <button onClick={onEdit} className="press mt-2 h-11 w-full rounded-[14px] text-sm text-ink-2">
        Edit stop
      </button>
    </article>
  );
}
