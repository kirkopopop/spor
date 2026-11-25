"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTrip } from "@/lib/store";
import { useUrlParam } from "@/lib/useUrlParam";
import { toBookCount } from "@/lib/format";
import { PlanView } from "./PlanView";
import { BookTab, MoneyTab, NotesTab } from "./TripTabs";

export type Tab = "plan" | "book" | "money" | "notes";
const TABS: Tab[] = ["plan", "book", "money", "notes"];

/** One trip, all tabs on the phone: switching tabs never waits on the network. */
export function TripScreen() {
  const { id } = useParams<{ id: string }>();
  const { trip, loaded } = useTrip(id);
  const [tabParam, setTabParam] = useUrlParam("tab", "push");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "plan";
  const setTab = (t: Tab) => setTabParam(t === "plan" ? null : t);

  if (!loaded) return <div className="flex-1" aria-busy="true" />;
  if (!trip) {
    return (
      <main className="flex-1 px-5 pt-14 text-sm text-muted">
        Not found. <Link href="/" className="text-ink underline">Trips</Link>
      </main>
    );
  }

  const toBook = toBookCount(trip);
  return (
    <>
      <div className="flex flex-1 flex-col">
        {tab === "plan" && <PlanView trip={trip} />}
        {tab === "book" && <BookTab trip={trip} onBack={() => setTab("plan")} />}
        {tab === "money" && <MoneyTab trip={trip} onBack={() => setTab("plan")} />}
        {tab === "notes" && <NotesTab trip={trip} onBack={() => setTab("plan")} />}
      </div>
      <nav className="sticky bottom-0 z-10 flex justify-around border-t border-line bg-bg px-3 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))] text-xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded-xl px-4 py-2 capitalize ${t === tab ? "bg-soft font-semibold" : "text-muted"}`}
          >
            {t === "book" && toBook > 0 ? `Book · ${toBook}` : t}
          </button>
        ))}
      </nav>
    </>
  );
}
