"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { listInvites, removeFromTrip, revokeInvite, setTripRole, shareTrip, usePeople, type Invite } from "@/lib/store";
import { roleOn, ROLE_LABEL } from "@/lib/access";
import type { Role, Trip } from "@/lib/types";
import { field, primaryButton } from "./Forms";

type Shared = Exclude<Role, "owner">;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Who a trip is shared with. The owner adds people by email (edit or view), changes their access
 * or removes them; everyone else sees who's on it and can leave.
 */
export function ShareSheet({ trip }: { trip: Trip }) {
  const { me } = usePeople();
  const router = useRouter();
  const mine = roleOn(trip, me);
  const owner = mine === "owner";
  const members = trip.members ?? [];
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Shared>("editor");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!owner) return;
    try {
      setInvites(await listInvites(trip.id));
    } catch {
      // Offline: the pending list just stays as it was.
    }
  }, [owner, trip.id]);
  useEffect(() => {
    // Pending invites live on the server only; fetch them when the sheet opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInvites();
  }, [loadInvites]);

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      if (done) setNotice({ text: done });
      await loadInvites();
      return true;
    } catch (e) {
      setNotice({ text: e instanceof Error ? e.message : "Something went wrong. Try again.", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function share(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!EMAIL.test(mail)) return;
    let result: "added" | "invited" | undefined;
    const ok = await run(async () => {
      result = await shareTrip(trip.id, mail, role);
    });
    if (ok) {
      setEmail("");
      setNotice({
        text:
          result === "added"
            ? `Shared with ${mail}. It's on their trips list now.`
            : `${mail} doesn't use tur yet. The trip will be waiting when they sign up with this email. Let them know.`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 pr-10">
      <div>
        <h3 className="text-[22px] font-bold tracking-[-0.02em]">Share {trip.name}</h3>
        <p className="mt-1 text-[15px] text-muted">
          {owner
            ? "People you add see this trip in their own tur. Your flights and places stay private."
            : mine === "editor"
              ? "You can edit this trip. Only its owner can share it."
              : "You can view this trip. Only its owner can share it or give edit access."}
        </p>
      </div>

      <ul className="divide-y divide-divider overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
        {members.map((m) => (
          <li key={m.userId} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-[15px] font-semibold text-ink-2">
              {(m.name || "?")[0].toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[16px]">
              {m.name || "Someone"}
              {m.userId === me && <span className="text-muted"> (you)</span>}
            </span>
            {owner && m.role !== "owner" ? (
              <span className="flex shrink-0 items-center gap-2">
                <select
                  aria-label={`Access for ${m.name}`}
                  value={m.role}
                  disabled={busy}
                  onChange={(e) => run(() => setTripRole(trip.id, m.userId, e.target.value as Shared))}
                  className="rounded-lg bg-soft px-2 py-1.5 text-[14px] text-ink-2 outline-none"
                >
                  <option value="editor">{ROLE_LABEL.editor}</option>
                  <option value="viewer">{ROLE_LABEL.viewer}</option>
                </select>
                <button
                  disabled={busy}
                  onClick={() => run(() => removeFromTrip(trip.id, m.userId), `${m.name || "They"} can no longer see this trip.`)}
                  className="text-[14px] text-danger"
                  aria-label={`Remove ${m.name}`}
                >
                  Remove
                </button>
              </span>
            ) : (
              <span className="shrink-0 text-[14px] text-muted">{m.role ? ROLE_LABEL[m.role] : ""}</span>
            )}
          </li>
        ))}
        {owner &&
          invites.map((i) => (
            <li key={i.email} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-[15px] text-muted">@</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px]">{i.email}</span>
                <span className="block text-[13px] text-muted">Waiting to sign up · {ROLE_LABEL[i.role]}</span>
              </span>
              <button disabled={busy} onClick={() => run(() => revokeInvite(trip.id, i.email), "Invite cancelled.")} className="shrink-0 text-[14px] text-danger">
                Cancel
              </button>
            </li>
          ))}
      </ul>

      {owner && (
        <form onSubmit={share} className="flex flex-col gap-2.5">
          <label>
            <span className="sr-only">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="Their email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>
          <div role="radiogroup" aria-label="Access" className="grid grid-cols-2 gap-0.5 rounded-xl bg-soft p-0.5">
            {(["editor", "viewer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={`rounded-[10px] py-2 text-[14px] transition-colors ${role === r ? "bg-raised font-semibold text-ink shadow-[var(--shadow-card)]" : "text-ink-2"}`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy || !EMAIL.test(email.trim())} className={primaryButton}>
            Share
          </button>
        </form>
      )}

      {notice && (
        <p role={notice.error ? "alert" : "status"} className={`text-[14px] ${notice.error ? "text-danger" : "text-ink-2"}`}>
          {notice.text}
        </p>
      )}

      {!owner &&
        me &&
        (confirmLeave ? (
          <button
            disabled={busy}
            onClick={async () => {
              if (await run(() => removeFromTrip(trip.id, me))) router.replace("/trips");
            }}
            className="press h-12 rounded-xl bg-danger text-[15px] font-semibold text-on-fill"
          >
            Leave {trip.name}?
          </button>
        ) : (
          <button onClick={() => setConfirmLeave(true)} className="h-11 text-[15px] text-danger">
            Leave trip
          </button>
        ))}
    </div>
  );
}
