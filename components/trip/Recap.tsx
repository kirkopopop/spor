"use client";

import type { Day, Trip } from "@/lib/types";
import { dayTab, money } from "@/lib/format";
import { recap, recorded } from "@/lib/recap";
import type { Leg } from "@/lib/walkLegs";
import { Chevron } from "../icons";
import { NoteItem } from "../TripTabs";

/**
 * Memory: the trip after it ends. One big number (places reached), the facts in a line, then
 * the days, the places you didn't reach, and the notes as a journal.
 */
export function Recap({ trip, legs, onDay }: { trip: Trip; legs: Map<string, Leg>; onDay: (d: Day) => void }) {
  const r = recap(trip, legs);
  const facts = [
    `${trip.days.length} day${trip.days.length === 1 ? "" : "s"}`,
    r.cities > 1 && `${r.cities} cities`,
    r.walkedKm > 0 && `${r.walkedKm.toLocaleString("en-GB")} km on foot`,
    r.spent > 0 && `${money(r.spent, trip.currency)} spent${r.plannedSpend > 0 ? ` of ${money(r.plannedSpend, trip.currency)}` : ""}`,
  ].filter(Boolean);

  return (
    <div className="px-5 pb-8">
      <section className="flex items-end gap-4 pt-1">
        <div className="tnum text-[52px] leading-none font-semibold tracking-[-0.03em]">{r.visited}</div>
        <div className="pb-1 text-[15px] leading-snug">
          <div className="font-semibold">{r.visited === 1 ? "place" : "places"}</div>
          <div className="text-muted">
            {r.recordedDays === 0
              ? "planned; nothing was ticked on the way"
              : r.fromPlan > 0
                ? `of ${r.planned} planned · ${r.fromPlan} day${r.fromPlan === 1 ? "" : "s"} from the plan`
                : `of ${r.planned} planned`}
          </div>
        </div>
      </section>
      <p className="tnum mt-3 text-[15px] text-ink-2">{facts.join(" · ")}</p>

      <Section title="Day by day">
        <ul className="divide-y divide-divider">
          {trip.days.map((d) => {
            const places = d.stops.filter((s) => !s.journey);
            const done = places.filter((s) => s.doneAt).length;
            const ticked = recorded(d);
            return (
              <li key={d.id}>
                <button onClick={() => onDay(d)} className="press flex w-full items-center gap-3 py-3 text-left">
                  <span className="tnum w-14 shrink-0 text-[14px] font-semibold">{dayTab(d.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-[16px]">{d.title || d.place}</span>
                  <span className={`tnum shrink-0 text-[14px] ${ticked && done === places.length ? "text-ok" : "text-muted"}`}>
                    {ticked ? `${done}/${places.length}` : `${places.length} planned`}
                  </span>
                  <Chevron size={16} className="-rotate-90 text-faint" />
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {r.missed.length > 0 && (
        <Section title="Didn't make it">
          <ul className="flex flex-col gap-3">
            {r.missed.map(({ day, stops }) => (
              <li key={day.id} className="flex gap-3 text-[15px]">
                <span className="tnum w-14 shrink-0 text-muted">{dayTab(day.date)}</span>
                <span className="text-ink-2">{stops.map((s) => s.name).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.journal.length > 0 && (
        <Section title="Journal">
          <ul className="divide-y divide-divider">
            {r.journal.map((n) => (
              <NoteItem key={n.id} note={n} trip={trip} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h4 className="mb-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">{title}</h4>
      {children}
    </section>
  );
}
