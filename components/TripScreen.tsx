"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTrip } from "@/lib/store";
import { useUrlParam } from "@/lib/useUrlParam";
import { toBookCount } from "@/lib/format";
import { tripClock } from "@/lib/live";
import { PlanView } from "./PlanView";
import { LiveView } from "./LiveView";
import { BookTab, MoneyTab, NotesTab } from "./TripTabs";

export type Tab = "today" | "plan" | "book" | "money" | "notes";

/** One trip, all tabs on the phone: switching tabs never waits on the network. */
export function TripScreen() {
  const { id } = useParams<{ id: string }>();
  const { trip, loaded } = useTrip(id);
  const [tabParam, setTabParam] = useUrlParam("tab", "push");
  const [preview] = useUrlParam("now", "replace"); // ?now=2026-12-22T13:10 previews the Live view

  if (!loaded) return <div className="flex-1" aria-busy="true" />;
  if (!trip) {
    return (
      <main className="flex-1 px-5 pt-14 text-sm text-muted">
        Not found. <Link href="/" className="text-ink underline">Trips</Link>
      </main>
    );
  }

  // During the trip the first tab is Today; before it, Book (what's left to sort out).
  const live = trip.stage === "live" || tripClock(trip, new Date(), preview).during;
  const tabs: Tab[] = live ? ["today", "plan", "money", "notes"] : ["plan", "book", "money", "notes"];
  const home = tabs[0];
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : home;
  const setTab = (t: Tab) => setTabParam(t === home ? null : t);
  const back = () => setTab(home);
  const toBook = toBookCount(trip);

  return (
    <>
      <div className="flex flex-1 flex-col">
        {tab === "today" && <LiveView trip={trip} preview={preview} />}
        {tab === "plan" && <PlanView trip={trip} />}
        {tab === "book" && <BookTab trip={trip} onBack={back} />}
        {tab === "money" && <MoneyTab trip={trip} onBack={back} />}
        {tab === "notes" && <NotesTab trip={trip} onBack={back} />}
      </div>
      <nav className="sticky bottom-0 z-10 flex justify-around border-t border-line bg-bg px-3 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))] text-xs">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={t === tab ? "page" : undefined}
            className={`press rounded-xl px-4 py-2 capitalize ${t === tab ? "bg-soft font-semibold" : "text-muted"}`}
          >
            {t === "book" && toBook > 0 ? `Book · ${toBook}` : t}
            {t === "notes" && (trip.notes?.length ?? 0) > 0 && <span className="ml-1 text-muted">· {trip.notes!.length}</span>}
          </button>
        ))}
      </nav>
    </>
  );
}
