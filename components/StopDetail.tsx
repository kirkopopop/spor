"use client";

import type { Booking, Stop, Trip } from "@/lib/types";
import { clockTime, leaveBy, mapsSearch, MODE_LABEL, shiftTime, showTime, travelMinutes } from "@/lib/format";
import { Back, Check, Close, Directions, Mode, NoteIcon } from "./icons";
import { RichText } from "./RichText";
import { useCanEdit } from "@/lib/store";
import { NoteForm } from "./Forms";
import { NoteItem } from "./TripTabs";

/** A stop as a place card in the sheet: the list said what and when; this says how and what if. */
export function StopDetail({
  trip,
  stop,
  number,
  booking,
  onBack,
  onClose,
  onShift,
  onPick,
  onEdit,
}: {
  trip: Trip;
  stop: Stop;
  number?: number;
  booking?: Booking;
  onBack?: () => void;
  onClose?: () => void;
  onShift: (time: string) => void;
  onPick: (optionId: string) => void;
  onEdit: () => void;
}) {
  const notes = (trip.notes ?? []).filter((n) => n.stopId === stop.id);
  const canEdit = useCanEdit(trip);
  const leave = leaveBy(stop);
  const maps = stop.mapsQuery
    ? mapsSearch(stop.mapsQuery)
    : stop.lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
      : undefined;
  const fixed = stop.kind === "fixed";

  return (
    <article className={`px-5 [animation:fade-in_180ms_ease-out] ${onClose ? "pb-5" : "pb-8"}`}>
      {onBack && (
        <button onClick={onBack} className="press -ml-1 mb-2 inline-flex items-center gap-1 py-1 text-[15px] font-medium text-accent">
          <Back size={17} />
          Day
        </button>
      )}
      <div className="flex items-start gap-3">
        {number != null && (
          <span
            className={`tnum mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-on-fill ${
              stop.doneAt ? "bg-ok" : fixed ? "bg-fixed" : "bg-accent"
            }`}
          >
            {number}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[24px] leading-tight font-bold tracking-[-0.02em] text-balance">{stop.name}</h3>
          <p className="tnum mt-1 text-[15px]">
            <span className={fixed ? "font-semibold text-fixed" : "text-ink-2"}>{showTime(stop)}</span>
            <span className="text-muted">
              {fixed && " · Fixed"}
              {stop.kind === "optional" && " · Optional"}
              {stop.who && ` · ${stop.who}`}
            </span>
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close stop"
            className="press -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-soft text-ink-2 hover:text-ink"
          >
            <Close size={16} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        {booking && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${booking.status === "booked" ? "bg-ok-soft text-ok" : "bg-fixed-soft text-fixed"}`}>
            {booking.status === "booked" && <Check size={13} />}
            {booking.status === "booked" ? "Booked" : "To book"}
          </span>
        )}
        {stop.fee && <span className="rounded-full bg-soft px-2.5 py-1 text-ink-2">{stop.fee.label}</span>}
      </div>

      {(maps || canEdit) && (
      <div className={`mt-4 grid gap-2 ${maps && canEdit ? "grid-cols-4" : "grid-cols-3"}`}>
        {maps && (
          <ActionButton href={maps} label="Directions" primary>
            <Directions size={19} />
          </ActionButton>
        )}
        {canEdit && (
          <>
            <ActionButton onClick={() => onShift(shiftTime(stop.time, -15))} label="Earlier">
              <span className="text-[15px] font-semibold">−15</span>
            </ActionButton>
            <ActionButton onClick={() => onShift(shiftTime(stop.time, 15))} label="Later">
              <span className="text-[15px] font-semibold">+15</span>
            </ActionButton>
            <ActionButton onClick={onEdit} label="Edit">
              <NoteIcon size={18} />
            </ActionButton>
          </>
        )}
      </div>
      )}

      {stop.go && (
        <section className="mt-5 flex gap-3 rounded-2xl bg-bg p-4 text-[15px]">
          <Mode mode={stop.go.mode} size={20} className="mt-0.5 shrink-0 text-ink-2" />
          <div>
            <div className="tnum font-semibold">
              {MODE_LABEL[stop.go.mode] ?? stop.go.mode} · {stop.go.est ? "~" : ""}
              {travelMinutes(stop.go.min)}
              {leave && <span className="text-fixed"> · leave by {clockTime(leave)}</span>}
            </div>
            {stop.go.text && <p className="mt-1 leading-relaxed text-ink-2">{stop.go.text}</p>}
          </div>
        </section>
      )}

      {stop.body && <p className="mt-5 text-[16px] leading-relaxed text-ink-2">{stop.body}</p>}

      {stop.options && stop.options.length > 0 && (
        <section className="mt-5">
          <h4 className={`mb-2 text-[13px] font-medium tracking-[0.02em] uppercase ${stop.pickOne ? "text-accent" : "text-muted"}`}>
            {stop.pickOne ? "Pick one" : "Options"}
          </h4>
          <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-line">
            {stop.options.map((o) => {
              const picked = o.id === stop.pickedOptionId;
              const inner = (
                <>
                  {stop.pickOne && (
                    <span className={`mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 ${picked ? "border-accent bg-accent text-on-fill" : "border-faint"}`}>
                      {picked && <Check size={12} />}
                    </span>
                  )}
                  <span className="flex-1">
                    <span className="block text-[16px] font-medium">{o.name}</span>
                    {o.body && <span className="mt-0.5 block text-[14px] leading-snug text-muted">{o.body}</span>}
                  </span>
                </>
              );
              return (
                <li key={o.id}>
                  {stop.pickOne ? (
                    <button onClick={() => onPick(o.id)} aria-pressed={picked} className="press flex w-full gap-3 px-4 py-3 text-left">
                      {inner}
                    </button>
                  ) : (
                    <a href={o.mapsQuery ? mapsSearch(o.mapsQuery) : undefined} target="_blank" rel="noreferrer" className="press flex gap-3 px-4 py-3">
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
        <section className="mt-5 rounded-2xl bg-bg p-4 text-[15px] leading-relaxed text-ink-2">
          <RichText text={stop.more} />
        </section>
      )}

      <section className="mt-6">
        <h4 className="mb-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Notes</h4>
        {notes.length > 0 && (
          <ul className="mb-2 divide-y divide-divider">
            {notes.map((n) => <NoteItem key={n.id} note={n} trip={trip} showWhere={false} />)}
          </ul>
        )}
        <NoteForm tripId={trip.id} stopId={stop.id} compact />
      </section>
    </article>
  );
}

function ActionButton({ children, label, onClick, href, primary }: { children: React.ReactNode; label: string; onClick?: () => void; href?: string; primary?: boolean }) {
  const cls = `press flex h-[60px] flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-medium ${
    primary ? "bg-accent text-on-fill" : "bg-soft text-ink"
  } ${!href && !onClick ? "opacity-40" : ""}`;
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
        {label}
      </a>
    );
  return (
    <button onClick={onClick} disabled={!onClick} className={cls}>
      {children}
      {label}
    </button>
  );
}
