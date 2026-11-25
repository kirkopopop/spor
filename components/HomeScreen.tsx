"use client";

import Link from "next/link";
import { useTrips } from "@/lib/store";
import { dateRange, daysUntil, money, monthYear, openPicks, plannedTotal, toBookCount } from "@/lib/format";
import type { Trip } from "@/lib/types";
import { BottomNav } from "./BottomNav";

export function HomeScreen() {
  const { trips, loaded } = useTrips();
  if (!loaded) return <div className="flex-1" aria-busy="true" />;

  const upcoming = trips.filter((t) => t.stage === "planning" || t.stage === "live");
  const next = upcoming.find((t) => daysUntil(t.endDate, t.timezone) >= 0);
  const planning = upcoming.filter((t) => t !== next);
  const ideas = trips.filter((t) => t.stage === "idea");
  const past = trips.filter((t) => t.stage === "memory").reverse();

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-14 pb-3">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">spor</h1>
        <div className="flex">
          <Avatar letter="K" className="bg-ink text-white" />
          <Avatar letter="T" className="-ml-2 bg-[#C9D6CF] text-ink" />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-6">
        {next ? <NextUp trip={next} /> : null}

        {planning.length > 0 && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Planning</h2>
            <div className="divide-y divide-divider rounded-2xl border border-line bg-card">
              {planning.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}`} className="flex items-center gap-3 px-3.5 py-3">
                  <div className="size-9 rounded-[10px] bg-[#EAF0E6]" />
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">{t.name}</div>
                    <div className="text-[13px] text-muted">{monthYear(t.startDate)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {ideas.length > 0 && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Ideas</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {ideas.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}`} className="rounded-xl border border-line bg-card px-3 py-2">
                  {t.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-[15px] font-semibold">Past</h2>
          {past.length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <div className="flex flex-col text-sm">
              {past.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}`} className="flex justify-between py-1.5">
                  <span>{t.name}</span>
                  <span className="text-muted">{monthYear(t.startDate)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav active="trips" />
    </>
  );
}

function NextUp({ trip }: { trip: Trip }) {
  const days = daysUntil(trip.startDate, trip.timezone);
  const when = days > 1 ? `in ${days} days` : days === 1 ? "tomorrow" : "now";
  const toBook = toBookCount(trip);
  const picks = openPicks(trip);
  const planned = plannedTotal(trip);
  // TODO(auth): drop the signed-in person, not a hard-coded traveller.
  const others = trip.people.filter((p) => p !== "Kirill");

  return (
    <Link href={`/trips/${trip.id}`} className="block rounded-[20px] border border-line bg-card p-4">
      <div className="text-xs font-medium text-muted">Next up · {when}</div>
      <div className="mt-1 text-[22px] font-bold tracking-[-0.02em]">{trip.name}</div>
      <div className="mt-0.5 text-sm text-ink-2">
        {dateRange(trip.startDate, trip.endDate)}
        {others.length > 0 && ` · ${others.join(", ")}`}
      </div>
      {(toBook > 0 || picks > 0 || planned > 0) && (
        <div className="mt-3.5 flex flex-wrap gap-2 text-[13px]">
          {toBook > 0 && (
            <span className="rounded-full bg-accent-soft px-2.5 py-1.5 font-semibold text-accent-ink">{toBook} to book</span>
          )}
          {picks > 0 && <span className="rounded-full bg-divider px-2.5 py-1.5 text-ink-2">{picks} picks open</span>}
          {planned > 0 && (
            <span className="rounded-full bg-divider px-2.5 py-1.5 text-ink-2">{money(planned, trip.currency)} planned</span>
          )}
        </div>
      )}
    </Link>
  );
}

function Avatar({ letter, className }: { letter: string; className: string }) {
  return (
    <div
      className={`flex size-8 items-center justify-center rounded-full border-2 border-bg text-[13px] font-semibold ${className}`}
    >
      {letter}
    </div>
  );
}
