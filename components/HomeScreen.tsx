"use client";

import Link from "next/link";
import { useTrips, useHousehold } from "@/lib/store";
import { dateRange, daysUntil, money, monthYear, openPicks, plannedTotal, toBookCount } from "@/lib/format";
import { projectRoutes } from "@/lib/routeMap";
import { hasSupabase } from "@/lib/supabase/env";
import { supabase } from "@/lib/supabase/client";
import type { Trip } from "@/lib/types";

export function HomeScreen() {
  const { trips, loaded } = useTrips();
  const { members, me } = useHousehold();
  if (!loaded) return <div className="flex-1" aria-busy="true" />;

  const upcoming = trips.filter((t) => t.stage === "planning" || t.stage === "live");
  const next = upcoming.find((t) => daysUntil(t.endDate, t.timezone) >= 0);
  const planning = upcoming.filter((t) => t !== next);
  const ideas = trips.filter((t) => t.stage === "idea");
  const past = trips.filter((t) => t.stage === "memory").reverse();
  const myName = members.find((m) => m.userId === me)?.name;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-14 pb-3">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">spor</h1>
        <div className="flex" aria-label={members.map((m) => m.name).join(", ")}>
          {members.map((m, i) => (
            <div
              key={m.userId}
              className={`flex size-8 items-center justify-center rounded-full border-2 border-bg text-[13px] font-semibold ${
                i === 0 ? "bg-ink text-white" : "-ml-2 bg-[#C9D6CF] text-ink"
              }`}
            >
              {m.name[0]}
            </div>
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-6">
        <RouteCard trips={trips} past={past} />
        {next ? <NextUp trip={next} myName={myName} /> : null}

        {planning.length > 0 && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold">Planning</h2>
            <div className="divide-y divide-divider rounded-2xl border border-line bg-card">
              {planning.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}`} className="press flex items-center gap-3 px-3.5 py-3">
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
                <Link key={t.id} href={`/trips/${t.id}`} className="press rounded-xl border border-line bg-card px-3 py-2">
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
                <Link key={t.id} href={`/trips/${t.id}`} className="press flex justify-between py-2">
                  <span>{t.name}</span>
                  <span className="text-muted">{monthYear(t.startDate)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {hasSupabase && (
          <button
            onClick={async () => {
              await supabase().auth.signOut();
              // A full load on purpose: it drops this session's in-memory store before the next person signs in.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/login");
            }}
            className="mt-auto self-start py-2 text-[13px] text-muted"
          >
            Sign out
          </button>
        )}
      </main>
    </>
  );
}

/** Every trip's route on one quiet map, with the totals that matter. */
function RouteCard({ trips, past }: { trips: Trip[]; past: Trip[] }) {
  const W = 350;
  const H = 170;
  const { routes } = projectRoutes(trips, W, H, 22);
  if (routes.length === 0) return null;
  const daysAway = past.reduce((n, t) => n + t.days.length, 0);
  const cities = new Set(trips.flatMap((t) => t.days.map((d) => d.city).filter(Boolean))).size;
  const isPast = new Set(past.map((t) => t.id));

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-[#E4EAEC]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Map of your trips">
        <rect width={W} height={H} fill="#E4EAEC" />
        {routes.map((r) => (
          <g key={r.tripId}>
            <polyline
              points={r.points.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#E2553A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isPast.has(r.tripId) ? undefined : "1 6"}
              opacity={0.9}
            />
            <circle cx={r.points[0][0]} cy={r.points[0][1]} r={4} fill="#fff" stroke="#E2553A" strokeWidth={2} />
            <circle cx={r.points.at(-1)![0]} cy={r.points.at(-1)![1]} r={4} fill="#16181D" />
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 left-3.5 flex gap-4 text-xs text-ink-2">
        <div><b className="text-[15px] text-ink">{past.length}</b> {past.length === 1 ? "trip" : "trips"}</div>
        <div><b className="text-[15px] text-ink">{cities}</b> {cities === 1 ? "city" : "cities"}</div>
        <div><b className="text-[15px] text-ink">{daysAway}</b> {daysAway === 1 ? "day" : "days"} away</div>
      </div>
    </div>
  );
}

function NextUp({ trip, myName }: { trip: Trip; myName?: string }) {
  const days = daysUntil(trip.startDate, trip.timezone);
  const when = days > 1 ? `in ${days} days` : days === 1 ? "tomorrow" : "now";
  const toBook = toBookCount(trip);
  const picks = openPicks(trip);
  const planned = plannedTotal(trip);
  const others = trip.people.filter((p) => p !== myName);
  const empty = trip.days.every((d) => d.stops.length === 0);

  return (
    <div className="rounded-[20px] border border-line bg-card p-4">
      <Link href={`/trips/${trip.id}`} className="press block">
        <div className="text-xs font-medium text-muted">Next up · {when}</div>
        <div className="mt-1 text-[22px] font-bold tracking-[-0.02em]">{trip.name}</div>
        <div className="mt-0.5 text-sm text-ink-2">
          {dateRange(trip.startDate, trip.endDate)}
          {others.length > 0 && ` · ${others.join(", ")}`}
        </div>
      </Link>
      {empty ? (
        // An empty trip has one useful next step: plan it with Claude.
        <a
          href={`https://claude.ai/new?q=${encodeURIComponent(`Let's plan ${trip.name} in spor (${trip.startDate} to ${trip.endDate}, ${trip.people.join(", ")}).`)}`}
          target="_blank"
          rel="noreferrer"
          className="press mt-3.5 inline-block rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          Plan with Claude
        </a>
      ) : (
        (toBook > 0 || picks > 0 || planned > 0) && (
          <div className="mt-3.5 flex flex-wrap gap-2 text-[13px]">
            {toBook > 0 && <span className="rounded-full bg-accent-soft px-2.5 py-1.5 font-semibold text-accent-ink">{toBook} to book</span>}
            {picks > 0 && <span className="rounded-full bg-divider px-2.5 py-1.5 text-ink-2">{picks} picks open</span>}
            {planned > 0 && <span className="rounded-full bg-divider px-2.5 py-1.5 text-ink-2">{money(planned, trip.currency)} planned</span>}
          </div>
        )
      )}
    </div>
  );
}
