"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTrip, removeFromTrip, updateTrip, useCanEdit, usePeople } from "@/lib/store";
import { roleOn } from "@/lib/access";
import { lostSummary, planDates, stageAfterDates, STAGE_LABEL, STAGES, type TripPatch } from "@/lib/tripEdit";
import type { Stage, Trip } from "@/lib/types";
import { field, primaryButton, Segmented } from "./Forms";
import { ChevronRight } from "./icons";

const CURRENCIES = ["EUR", "DKK", "GBP", "USD"] as const;
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The trip's ⋯ menu: edit, stage, and delete (owner) or leave (everyone else). */
export function TripMenu({ trip, onEdit }: { trip: Trip; onEdit: () => void }) {
  const { me } = usePeople();
  const router = useRouter();
  const owner = roleOn(trip, me) === "owner";
  const canEdit = useCanEdit(trip);
  const [stage, setStage] = useState<Stage>(trip.stage);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function changeStage(next: Stage) {
    const before = stage;
    setStage(next);
    setError(undefined);
    try {
      await updateTrip(trip.id, { stage: next });
    } catch (e) {
      setStage(before);
      setError(errorText(e));
    }
  }

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      if (owner) await deleteTrip(trip.id);
      else if (me) await removeFromTrip(trip.id, me);
      router.replace("/trips");
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="line-clamp-2 pr-10 text-[22px] font-bold tracking-[-0.02em]">{trip.name}</h3>

      {canEdit && (
        <>
          <button
            onClick={onEdit}
            className="press flex min-h-12 items-center rounded-2xl bg-bg px-4 text-left text-[16px]"
          >
            <span className="flex-1">Edit</span>
            <span className="mr-2 truncate text-[14px] text-muted">Name, dates, currency</span>
            <ChevronRight size={16} className="text-faint" />
          </button>
          <div className="flex flex-col gap-2">
            <span className="px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">Stage</span>
            <Segmented label="Stage" value={stage} onChange={changeStage} options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))} />
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      )}

      {(owner || me) &&
        (confirm ? (
          <div className="flex flex-col gap-2">
            {owner && (trip.members?.length ?? 0) > 1 && <p className="text-[14px] text-ink-2">It goes for everyone it&apos;s shared with.</p>}
            <button disabled={busy} onClick={remove} className="press h-12 rounded-xl bg-danger text-[15px] font-semibold text-on-fill disabled:opacity-40">
              {busy ? (owner ? "Deleting…" : "Leaving…") : `${owner ? "Delete" : "Leave"} ${trip.name}?`}
            </button>
            <button disabled={busy} onClick={() => setConfirm(false)} className="h-11 text-[15px] text-ink-2">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="h-11 text-[15px] text-danger">
            {owner ? "Delete trip" : "Leave trip"}
          </button>
        ))}
    </div>
  );
}

/** Name, dates and currency. Dates that would remove days with stops ask first. */
export function TripEditForm({ trip, onDone }: { trip: Trip; onDone: () => void }) {
  const [name, setName] = useState(trip.name);
  const [start, setStart] = useState(trip.startDate);
  const [end, setEnd] = useState(trip.endDate);
  const [currency, setCurrency] = useState<Trip["currency"]>(trip.currency);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // A trip with days keeps its dates; an idea can stay without them.
  const datesOk = (!start && !end && trip.days.length === 0) || (!!start && !!end && end >= start);
  const valid = name.trim().length > 0 && datesOk;
  const datesChanged = start !== trip.startDate || end !== trip.endDate;
  const lost = datesChanged && datesOk ? planDates(trip, start, end).lost : [];

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    if (lost.length && !confirming) return setConfirming(true);
    const patch: TripPatch = {};
    if (name.trim() !== trip.name) patch.name = name.trim();
    if (currency !== trip.currency) patch.currency = currency;
    if (datesChanged) {
      patch.startDate = start;
      patch.endDate = end;
      const stage = stageAfterDates(trip.stage, start);
      if (stage !== trip.stage) patch.stage = stage;
    }
    if (!Object.keys(patch).length) return onDone();
    setBusy(true);
    setError(undefined);
    try {
      await updateTrip(trip.id, patch);
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 pr-10">
      <h3 className="text-[22px] font-bold tracking-[-0.02em]">Edit trip</h3>
      <label>
        <span className="sr-only">Name</span>
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[13px] text-muted">
          From
          <input type="date" value={start} onChange={(e) => (setStart(e.target.value), setConfirming(false))} className={`${field} mt-1`} />
        </label>
        <label className="text-[13px] text-muted">
          To
          <input type="date" value={end} min={start || undefined} onChange={(e) => (setEnd(e.target.value), setConfirming(false))} className={`${field} mt-1`} />
        </label>
      </div>
      <label className="text-[13px] text-muted">
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Trip["currency"])} className={`${field} mt-1`}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {!datesOk && <p className="text-[14px] text-danger">{trip.days.length ? "Add both dates." : "Add both dates, or neither for an idea."}</p>}
      {error && (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      )}
      {confirming && lost.length > 0 ? (
        <div className="flex flex-col gap-2" role="alertdialog" aria-label="Remove days">
          <p className="text-[15px] text-ink-2">{lostSummary(lost)}.</p>
          <button type="submit" disabled={busy} className="press h-12 rounded-xl bg-danger text-[15px] font-semibold text-on-fill disabled:opacity-40">
            {busy ? "Saving…" : lost.length === 1 ? "Remove the day and save" : `Remove ${lost.length} days and save`}
          </button>
          <button type="button" onClick={() => (setStart(trip.startDate), setEnd(trip.endDate), setConfirming(false))} className="h-11 text-[15px] text-ink-2">
            Keep the dates
          </button>
        </div>
      ) : (
        <button type="submit" disabled={!valid || busy} className={primaryButton}>
          {busy ? "Saving…" : "Save"}
        </button>
      )}
    </form>
  );
}
