"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { editStop, useTrip } from "@/lib/store";
import { useUrlParam } from "@/lib/useUrlParam";
import { dateRange, todayIn, toBookCount } from "@/lib/format";
import { nowNext, tripClock } from "@/lib/live";
import { dayPins, dayRoutes } from "@/lib/tripView";
import type { Day } from "@/lib/types";
import { TripMap } from "./map/TripMap";
import { BottomSheet, type Snap } from "./trip/BottomSheet";
import { DayPlan } from "./trip/DayPlan";
import { LiveView } from "./LiveView";
import { StopDetail } from "./StopDetail";
import { BookTab, MoneyTab, NotesTab } from "./TripTabs";
import { Sheet } from "./Sheet";
import { StopForm } from "./Forms";
import { Back } from "./icons";

export type Tab = "today" | "plan" | "book" | "money" | "notes";
const LABEL: Record<Tab, string> = { today: "Today", plan: "Plan", book: "Bookings", money: "Money", notes: "Notes" };
type Modal = { kind: "stop-form"; stopId?: string } | { kind: "rain" };

/** A trip: the map on top, the plan in a sheet over it. Tab, day and open stop live in the address. */
export function TripScreen() {
  const { id } = useParams<{ id: string }>();
  const { trip, loaded } = useTrip(id);
  const [tabParam, setTabParam] = useUrlParam("tab", "push");
  const [dayParam, setDayParam] = useUrlParam("day", "replace");
  const [stopParam, setStopParam] = useUrlParam("stop", "push");
  const [preview] = useUrlParam("now", "replace"); // ?now=2026-12-22T13:10 previews Today
  const [snap, setSnap] = useState<Snap>("half");
  const [sheetPx, setSheetPx] = useState(0);
  const [modal, setModal] = useState<Modal>();
  const onHeight = useCallback((px: number) => setSheetPx(px), []);

  const clock = trip ? tripClock(trip, new Date(), preview) : undefined;
  const live = !!trip && (trip.stage === "live" || !!clock?.during);
  const tabs: Tab[] = live ? ["today", "plan", "book", "money", "notes"] : ["plan", "book", "money", "notes"];
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : tabs[0];

  const allStops = trip?.days.flatMap((d) => d.stops) ?? [];
  const openStop = stopParam ? allStops.find((s) => s.id === stopParam) : undefined;
  const stopDay = openStop ? trip?.days.find((d) => d.stops.some((s) => s.id === openStop.id)) : undefined;
  const liveDay = live ? trip?.days.find((d) => d.date === clock?.date) : undefined;
  const today = trip ? todayIn(trip.timezone) : "";
  const day: Day | undefined =
    stopDay ??
    (tab === "today" ? liveDay : undefined) ??
    trip?.days.find((d) => d.date === dayParam) ??
    trip?.days.find((d) => d.date === today) ??
    trip?.days[0];
  const nextId = day && clock && day.date === clock.date ? nowNext(day.stops, clock.time).next?.id : undefined;
  const { pins, numbers } = useMemo(
    () => (day ? dayPins(day, nextId) : { pins: [], numbers: new Map<string, number>(), route: { id: "", points: [] } }),
    [day, nextId],
  );
  // Stop order as quiet dashes (not real paths); the leg into the open or next stop solid.
  const activeId = stopParam ?? nextId; // a plain id from the address, not the stop object
  const routes = useMemo(() => dayRoutes(day, activeId), [day, activeId]);

  if (!loaded) return <div className="min-h-dvh bg-map" aria-busy="true" />;
  if (!trip) {
    return (
      <main className="flex min-h-dvh flex-col items-start justify-center gap-3 px-6">
        <h1 className="text-[22px] font-bold">Trip not found</h1>
        <Link href="/trips" className="text-[16px] font-medium text-accent">
          All trips
        </Link>
      </main>
    );
  }

  const open = (stopId: string) => {
    setStopParam(stopId);
    if (snap === "peek") setSnap("half");
  };
  const toBook = toBookCount(trip);
  const others = trip.people.join(", ");

  const header = (
    <div className="pb-3">
      <div className="flex items-start gap-2">
        {/* On wide screens the back control lives in the panel, not loose on the map. */}
        <Link href="/trips" aria-label="All trips" className="press -ml-1.5 hidden size-8 shrink-0 items-center justify-center rounded-full text-accent min-[900px]:flex">
          <Back size={20} />
        </Link>
        <h1 className="line-clamp-2 text-[24px] leading-tight font-bold tracking-[-0.02em] text-balance">{trip.name}</h1>
      </div>
      <p className="mt-0.5 truncate text-[14px] text-muted">
        {trip.startDate ? dateRange(trip.startDate, trip.endDate) : "No dates yet"}
        {others && ` · ${others}`}
      </p>
      <div role="tablist" aria-label="Trip" className="mt-3 grid rounded-xl bg-soft p-0.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => {
              setStopParam(null);
              setTabParam(t === tabs[0] ? null : t);
            }}
            className={`rounded-[10px] py-1.5 text-[13px] whitespace-nowrap transition-colors ${
              t === tab ? "bg-card font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"
            }`}
          >
            {LABEL[t]}
            {t === "book" && toBook > 0 && <span className="ml-1 font-semibold text-fixed">{toBook}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-map">
      <TripMap
        pins={pins}
        routes={routes}
        selectedId={openStop?.id}
        onSelect={open}
        padding={{ top: 80, bottom: sheetPx + 24, left: 40, right: 40 }}
        className="absolute inset-0 min-[900px]:left-[452px]"
        label={`Map of ${day ? day.title || day.date : trip.name}`}
      />

      <Link
        href="/trips"
        aria-label="All trips"
        className="press absolute top-[max(14px,env(safe-area-inset-top))] left-4 z-10 flex size-10 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-float)] min-[900px]:hidden"
      >
        <Back size={20} />
      </Link>

      <BottomSheet header={header} snap={snap} onSnap={setSnap} onHeight={onHeight}>
        {openStop ? (
          <StopDetail
            trip={trip}
            stop={openStop}
            number={numbers.get(openStop.id)}
            booking={openStop.bookingId ? trip.bookings.find((b) => b.id === openStop.bookingId) : undefined}
            onBack={() => window.history.back()}
            onShift={(time) => editStop(trip.id, openStop.id, { time })}
            onPick={(pickedOptionId) => editStop(trip.id, openStop.id, { pickedOptionId })}
            onEdit={() => setModal({ kind: "stop-form", stopId: openStop.id })}
          />
        ) : tab === "today" ? (
          <LiveView trip={trip} preview={preview} numbers={numbers} onOpen={open} />
        ) : tab === "plan" ? (
          <DayPlan
            trip={trip}
            day={day}
            numbers={numbers}
            onDay={(d) => setDayParam(d.date)}
            onOpen={open}
            onAdd={() => setModal({ kind: "stop-form" })}
            onRain={() => setModal({ kind: "rain" })}
          />
        ) : tab === "book" ? (
          <BookTab trip={trip} />
        ) : tab === "money" ? (
          <MoneyTab trip={trip} />
        ) : (
          <NotesTab trip={trip} />
        )}
      </BottomSheet>

      <Sheet open={!!modal} onClose={() => setModal(undefined)} label={modal?.kind === "rain" ? "If it rains" : "Stop"}>
        {modal?.kind === "stop-form" && day && (
          <StopForm
            key={modal.stopId ?? "new"}
            trip={trip}
            day={trip.days.find((d) => d.stops.some((s) => s.id === modal.stopId)) ?? day}
            stop={modal.stopId ? allStops.find((s) => s.id === modal.stopId) : undefined}
            onDone={() => window.history.back()}
          />
        )}
        {modal?.kind === "rain" && (
          <>
            <h3 className="text-[22px] font-bold tracking-[-0.02em]">If it rains</h3>
            <ul className="mt-3 flex flex-col gap-3 text-[16px] leading-relaxed text-ink-2">
              {day?.rain.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </>
        )}
      </Sheet>
    </div>
  );
}
