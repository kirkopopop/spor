"use client";

import Image from "next/image";
import Link from "next/link";
import journey from "@/assets/photos/journey.jpg";
import { useMemo } from "react";
import { useHousehold, useTrips } from "@/lib/store";
import { dateRange, daysUntil, money, monthYear, openPicks, plannedTotal, todayIn, toBookCount } from "@/lib/format";
import { groupTrips } from "@/lib/tripView";
import type { Trip } from "@/lib/types";
import { Group, Row, Screen } from "./shell/TabBar";
import { OverviewGlobe } from "./OverviewGlobe";
import { DestinationMark, DestinationPhoto, LandmarkIcon, TripTile } from "./Destination";
import { destinationOf, tripPlace } from "@/lib/destination";
import { ChatIcon } from "./icons";

/** Overview: every trip at a glance, the next one first. */
export function HomeScreen() {
  const { trips, loaded } = useTrips();
  const { members, me } = useHousehold();
  const today = todayIn("Europe/Copenhagen");
  const groups = useMemo(() => groupTrips(trips, today), [trips, today]);
  const myName = members.find((m) => m.userId === me)?.name;

  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;

  const next = groups.now[0] ?? groups.upcoming[0];
  const later = [...groups.now, ...groups.upcoming].filter((t) => t !== next);
  const year = today.slice(0, 4);
  const thisYear = groups.past.filter((t) => t.startDate.startsWith(year));
  const daysAway = thisYear.reduce((n, t) => n + t.days.length, 0);
  const cities = new Set(thisYear.flatMap((t) => t.days.map((d) => d.city).filter(Boolean))).size;
  const onGlobe = trips.some((t) => tripPlace(t));

  return (
    <Screen
      title="Overview"
      aside={
        onGlobe && (
          <OverviewGlobe
            trips={trips}
            today={today}
            focus={next}
            stats={
              thisYear.length > 0 && (
                <p className="rounded-full bg-card/88 px-3 py-1.5 text-[13px] text-ink-2 shadow-[var(--shadow-float)] backdrop-blur-md">
                  {year}: <b className="font-semibold text-ink">{thisYear.length}</b> {thisYear.length === 1 ? "trip" : "trips"} ·{" "}
                  <b className="font-semibold text-ink">{daysAway}</b> days away · <b className="font-semibold text-ink">{cities}</b>{" "}
                  {cities === 1 ? "city" : "cities"}
                </p>
              )
            }
          />
        )
      }
      action={
        <Link
          href="/settings"
          aria-label="Settings"
          className="press mb-1.5 flex size-9 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-on-ink"
        >
          {(myName ?? "spor")[0].toUpperCase()}
        </Link>
      }
    >

      {next ? <NextTrip trip={next} live={groups.now.includes(next)} myName={myName} /> : <EmptyNext />}

      {later.length > 0 && <TripGroup title="Upcoming" trips={later} />}
      {groups.ideas.length > 0 && <TripGroup title="Ideas" trips={groups.ideas} />}
      {groups.past.length > 0 && <TripGroup title="Past" trips={groups.past} />}
    </Screen>
  );
}

function NextTrip({ trip, live, myName }: { trip: Trip; live: boolean; myName?: string }) {
  const days = daysUntil(trip.startDate, trip.timezone);
  const toBook = toBookCount(trip);
  const picks = openPicks(trip);
  const planned = plannedTotal(trip);
  const empty = trip.days.every((d) => d.stops.length === 0);
  const others = trip.people.filter((p) => p !== myName);

  const dest = destinationOf(trip);
  const countdown = live ? (
    <div className="text-[17px] font-semibold">Now</div>
  ) : (
    <>
      <div className="text-[52px] leading-none font-semibold tracking-[-0.03em]">{days}</div>
      <div className="mt-1 text-[13px] opacity-80">{days === 1 ? "day to go" : "days to go"}</div>
    </>
  );
  const meta = (
    <>
      {dateRange(trip.startDate, trip.endDate)}
      {others.length > 0 && ` · ${others.join(", ")}`}
    </>
  );

  return (
    <section className="overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)]">
      {dest.photo ? (
        // Where you're going, before anything is read: the place, its name, the days left.
        <Link href={`/trips/${trip.id}`} className="press group relative block h-[196px] overflow-hidden text-white">
          <DestinationPhoto
            photo={dest.photo}
            sizes="(min-width: 640px) 608px, 100vw"
            eager
            className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.62),rgb(0_0_0/0.08)_55%,transparent)]" />
          <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[12px] font-semibold backdrop-blur-md">
            <LandmarkIcon landmark={dest.key} size={14} />
            {dest.label}
          </span>
          <div className="absolute inset-x-5 bottom-4 flex items-end gap-4 [text-shadow:0_1px_10px_rgb(0_0_0/0.3)]">
            <div className="min-w-0 flex-1">
              <h2 className="text-[24px] leading-tight font-bold tracking-[-0.02em] text-balance">{trip.name}</h2>
              <p className="mt-0.5 text-[15px] opacity-90">{meta}</p>
            </div>
            <div className="tnum shrink-0 text-right">{countdown}</div>
          </div>
        </Link>
      ) : (
        <Link href={`/trips/${trip.id}`} className="press flex items-center gap-4 p-5">
          <DestinationMark destination={dest} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{trip.name}</h2>
            <p className="mt-1 text-[15px] text-ink-2">{meta}</p>
          </div>
          <div className="tnum shrink-0 text-center text-ink">{countdown}</div>
        </Link>
      )}
      <div className="flex flex-wrap gap-2 border-t border-divider px-5 py-3.5">
        {empty ? (
          <a
            href={`https://claude.ai/new?q=${encodeURIComponent(`Let's plan ${trip.name} in spor (${trip.startDate} to ${trip.endDate}, ${trip.people.join(", ")}).`)}`}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-on-fill"
          >
            <ChatIcon size={17} />
            Plan with Claude
          </a>
        ) : (
          <>
            {toBook > 0 && <Chip tone="fixed">{toBook} to book</Chip>}
            {picks > 0 && <Chip>{picks} picks open</Chip>}
            {planned > 0 && <Chip>{money(planned, trip.currency)} planned</Chip>}
            {toBook === 0 && picks === 0 && <Chip tone="ok">All booked</Chip>}
          </>
        )}
      </div>
    </section>
  );
}

function EmptyNext() {
  return (
    <section className="overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)]">
      <div className="relative h-[132px] bg-map">
        <Image src={journey} alt="" fill sizes="(min-width: 640px) 608px, 100vw" placeholder="blur" className="object-cover object-[52%_45%]" />
      </div>
      <div className="p-5">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">No trip coming up</h2>
        <a
          href={`https://claude.ai/new?q=${encodeURIComponent("Let's plan a new trip in spor.")}`}
          target="_blank"
          rel="noreferrer"
          className="press mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-on-fill"
        >
          <ChatIcon size={17} />
          Plan with Claude
        </a>
      </div>
    </section>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "fixed" | "ok" }) {
  const cls = tone === "fixed" ? "bg-fixed-soft text-fixed" : tone === "ok" ? "bg-ok-soft text-ok" : "bg-soft text-ink-2";
  return <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${cls}`}>{children}</span>;
}

export function TripGroup({ title, trips }: { title: string; trips: Trip[] }) {
  return (
    <Group title={title}>
      {trips.map((t) => (
        <Row key={t.id} href={`/trips/${t.id}`} chevron>
          <div className="flex items-center gap-3.5">
            <TripTile trip={t} />
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold">{t.name}</div>
              <div className="text-[14px] text-muted">
                {t.startDate ? `${dateRange(t.startDate, t.endDate)} · ${monthYear(t.startDate).slice(-4)}` : "No dates yet"}
              </div>
            </div>
          </div>
        </Row>
      ))}
    </Group>
  );
}

