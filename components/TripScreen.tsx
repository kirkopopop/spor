"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { editStop, useCanEdit, useTrip } from "@/lib/store";
import { useUrlParam } from "@/lib/useUrlParam";
import { dateRange, todayIn, toBookCount } from "@/lib/format";
import { nowNext, tripClock } from "@/lib/live";
import { dayPins, dayRoutes } from "@/lib/tripView";
import { recapMap } from "@/lib/recap";
import { applyLegs } from "@/lib/walkLegs";
import { useWalkLegs } from "@/lib/useWalkLegs";
import type { Day } from "@/lib/types";
import { TripMap } from "./map/TripMap";
import { BottomSheet, useWide, type Snap } from "./trip/BottomSheet";
import { DayPlan } from "./trip/DayPlan";
import { Recap } from "./trip/Recap";
import { LiveView } from "./LiveView";
import { StopDetail } from "./StopDetail";
import { BookTab, MoneyTab, NotesTab } from "./TripTabs";
import { Sheet } from "./Sheet";
import { StopForm } from "./Forms";
import { Back, MoreIcon, PeopleIcon } from "./icons";
import { TripEditForm, TripMenu } from "./TripMenu";
import { ShareSheet } from "./ShareSheet";
import { DestinationMark } from "./Destination";
import { destinationOf, tripPlace } from "@/lib/destination";

const CARD_W = 380; // the stop card over the map on wide screens

export type Tab = "today" | "memory" | "plan" | "book" | "money" | "notes";
const LABEL: Record<Tab, string> = { today: "Today", memory: "Memory", plan: "Plan", book: "Bookings", money: "Money", notes: "Notes" };
type Modal = { kind: "stop-form"; stopId?: string } | { kind: "rain" } | { kind: "share" } | { kind: "menu" } | { kind: "edit" };
const MODAL_LABEL: Record<Modal["kind"], string> = { "stop-form": "Stop", rain: "If it rains", share: "Share trip", menu: "Trip options", edit: "Edit trip" };

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
  const wide = useWide();
  const canEdit = useCanEdit(trip);

  const clock = trip ? tripClock(trip, new Date(), preview) : undefined;
  const today = trip ? todayIn(trip.timezone) : "";
  const live = !!trip && (trip.stage === "live" || !!clock?.during);
  const past = !!trip && !live && (trip.stage === "memory" || (!!trip.endDate && trip.endDate < today));
  const tabs: Tab[] = live
    ? ["today", "plan", "book", "money", "notes"]
    : past
      ? ["memory", "plan", "book", "money", "notes"]
      : ["plan", "book", "money", "notes"];
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : tabs[0];

  const rawStops = trip?.days.flatMap((d) => d.stops) ?? [];
  const stopDay = stopParam ? trip?.days.find((d) => d.stops.some((s) => s.id === stopParam)) : undefined;
  const liveDay = live ? trip?.days.find((d) => d.date === clock?.date) : undefined;
  const rawDay: Day | undefined =
    stopDay ??
    (tab === "today" ? liveDay : undefined) ??
    trip?.days.find((d) => d.date === dayParam) ??
    trip?.days.find((d) => d.date === today) ??
    trip?.days[0];

  // Real walking paths and times: for the shown day, or the whole trip in Memory.
  const memory = tab === "memory" && !stopParam;
  const legDays = useMemo(() => (memory ? (trip?.days ?? []) : [rawDay]), [memory, trip, rawDay]);
  const legs = useWalkLegs(legDays);
  const day = useMemo(() => rawDay && applyLegs(rawDay, legs), [rawDay, legs]);
  // The trip as shown: the day with routed times in place, so lists, cards and leave-by agree.
  const view = useMemo(() => (trip && day && day !== rawDay ? { ...trip, days: trip.days.map((d) => (d.id === day.id ? day : d)) } : trip), [trip, day, rawDay]);
  const openStop = stopParam ? view?.days.flatMap((d) => d.stops).find((s) => s.id === stopParam) : undefined;

  const nextId = day && clock && day.date === clock.date ? nowNext(day.stops, clock.time).next?.id : undefined;
  const { pins, numbers } = useMemo(
    () => (day ? dayPins(day, nextId) : { pins: [], numbers: new Map<string, number>(), route: { id: "", points: [] } }),
    [day, nextId],
  );
  const activeId = stopParam ?? nextId; // a plain id from the address, not the stop object
  const routes = useMemo(() => dayRoutes(day, activeId, legs), [day, activeId, legs]);
  const tripMap = useMemo(() => (memory && trip ? recapMap(trip, legs) : undefined), [memory, trip, legs]);
  const openStopId = stopParam && rawStops.some((s) => s.id === stopParam) ? stopParam : undefined;
  const card = wide && !!openStopId; // on wide screens a stop opens as a card over the map

  // Nothing on the map has a place: look at the destination, or, with no destination either,
  // give the plan the screen and leave the map a strip.
  const place = useMemo(() => (trip ? tripPlace(trip) : undefined), [trip]);
  const nowhere = loaded && !!trip && !place;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (nowhere) setSnap((s) => (s === "half" ? "full" : s));
  }, [nowhere]);

  // Escape closes the stop card.
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !modal && window.history.back();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, modal]);

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
  const shown = view ?? trip; // with routed walking times; edits still go through the stored trip
  const goDay = (d: Day) => {
    setTabParam("plan");
    setDayParam(d.date);
  };
  const toBook = toBookCount(trip);
  const others = trip.people.join(", ");
  const sharedWith = (trip.members ?? []).filter((m) => m.role !== "owner").length;

  const header = (
    <div className="pb-3">
      <div className="flex items-start gap-2">
        {/* On wide screens the back control lives in the panel, not loose on the map. */}
        <Link href="/trips" aria-label="All trips" className="press -ml-1.5 hidden size-8 shrink-0 items-center justify-center rounded-full text-accent min-[900px]:flex">
          <Back size={20} />
        </Link>
        <span className="mt-0.5 [animation:mark-in_420ms_cubic-bezier(.34,1.56,.64,1)_both]">
          <DestinationMark destination={destinationOf(trip)} size={32} />
        </span>
        <h1 className="line-clamp-2 flex-1 text-[24px] leading-tight font-bold tracking-[-0.02em] text-balance">{trip.name}</h1>
        <button
          onClick={() => setModal({ kind: "share" })}
          aria-label={sharedWith ? `Shared with ${sharedWith} ${sharedWith === 1 ? "person" : "people"}` : "Share trip"}
          className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-soft px-3 text-[14px] font-medium text-ink-2"
        >
          <PeopleIcon size={17} />
          {sharedWith > 0 ? sharedWith + 1 : "Share"}
        </button>
        <button
          onClick={() => setModal({ kind: "menu" })}
          aria-label="Trip options"
          className="press -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-ink-2"
        >
          <MoreIcon size={20} />
        </button>
      </div>
      <p className="mt-0.5 truncate text-[14px] text-muted">
        {trip.startDate ? dateRange(trip.startDate, trip.endDate) : "No dates yet"}
        {others && ` · ${others}`}
        {!canEdit && " · View only"}
      </p>
      <div role="tablist" aria-label="Trip" className="mt-3 grid max-w-[440px] rounded-xl bg-soft p-0.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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
              t === tab ? "bg-raised font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"
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
        pins={tripMap?.pins ?? pins}
        routes={tripMap?.routes ?? routes}
        selectedId={openStop?.id}
        onSelect={tripMap ? (dayId) => goDay(trip.days.find((d) => d.id === dayId)!) : open}
        // With no sheet below (laptop), keep pins clear of the bottom edge and the map credit.
        padding={{ top: 80, bottom: sheetPx ? sheetPx + 24 : 64, left: card ? CARD_W + 40 : 56, right: 56 }}
        center={place}
        className="absolute inset-0 min-[900px]:left-1/2"
        label={tripMap ? `Map of ${trip.name} as it happened` : `Map of ${day ? day.title || day.date : trip.name}`}
      />

      <Link
        href="/trips"
        aria-label="All trips"
        className="press absolute top-[max(14px,env(safe-area-inset-top))] left-4 z-10 flex size-10 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-float)] min-[900px]:hidden"
      >
        <Back size={20} />
      </Link>

      <BottomSheet header={header} snap={snap} onSnap={setSnap} onHeight={onHeight}>
        {openStop && !card ? (
          <StopDetail
            trip={shown}
            stop={openStop}
            number={numbers.get(openStop.id)}
            booking={openStop.bookingId ? trip.bookings.find((b) => b.id === openStop.bookingId) : undefined}
            onBack={() => window.history.back()}
            onShift={(time) => editStop(trip.id, openStop.id, { time })}
            onPick={(pickedOptionId) => editStop(trip.id, openStop.id, { pickedOptionId })}
            onEdit={() => setModal({ kind: "stop-form", stopId: openStop.id })}
          />
        ) : tab === "today" ? (
          <LiveView trip={shown} preview={preview} numbers={numbers} onOpen={open} onAdd={canEdit ? () => setModal({ kind: "stop-form" }) : undefined} />
        ) : tab === "memory" ? (
          <Recap trip={shown} legs={legs} onDay={goDay} />
        ) : tab === "plan" ? (
          <DayPlan
            trip={shown}
            day={day}
            numbers={numbers}
            selectedId={card ? openStopId : undefined}
            onDay={(d) => {
              if (card) setStopParam(null);
              setDayParam(d.date);
            }}
            onOpen={open}
            onAdd={canEdit ? () => setModal({ kind: "stop-form" }) : undefined}
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

      {card && openStop && (
        // Docked against the plan, at the seam with the map: list, then the stop, then where it is.
        // As tall as the stop needs, scrolling only past the screen.
        <aside
          aria-label="Stop"
          style={{ width: CARD_W }}
          className="absolute top-4 left-[calc(50%+4px)] z-30 flex max-h-[calc(100%-32px)] flex-col overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-float)] [animation:card-in_220ms_cubic-bezier(.2,.9,.25,1)]"
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain pt-5">
            <StopDetail
              key={openStop.id}
              trip={shown}
              stop={openStop}
              number={numbers.get(openStop.id)}
              booking={openStop.bookingId ? trip.bookings.find((b) => b.id === openStop.bookingId) : undefined}
              onClose={() => window.history.back()}
              onShift={(time) => editStop(trip.id, openStop.id, { time })}
              onPick={(pickedOptionId) => editStop(trip.id, openStop.id, { pickedOptionId })}
              onEdit={() => setModal({ kind: "stop-form", stopId: openStop.id })}
            />
          </div>
        </aside>
      )}

      <Sheet open={!!modal} onClose={() => setModal(undefined)} label={modal ? MODAL_LABEL[modal.kind] : "Stop"}>
        {modal?.kind === "share" && <ShareSheet trip={trip} />}
        {modal?.kind === "menu" && <TripMenu trip={trip} onEdit={() => setModal({ kind: "edit" })} />}
        {modal?.kind === "edit" && <TripEditForm trip={trip} onDone={() => window.history.back()} />}
        {modal?.kind === "stop-form" && day && (
          <StopForm
            key={modal.stopId ?? "new"}
            trip={trip}
            day={trip.days.find((d) => d.stops.some((s) => s.id === modal.stopId)) ?? rawDay ?? day}
            stop={modal.stopId ? rawStops.find((s) => s.id === modal.stopId) : undefined}
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
