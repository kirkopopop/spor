"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { refreshHousehold, savePrefs, useHousehold, usePrefs } from "@/lib/store";
import { hasSupabase } from "@/lib/supabase/env";
import { supabase } from "@/lib/supabase/client";
import type { Trip } from "@/lib/types";
import { Group, Row, Screen } from "./shell/TabBar";
import { Sheet } from "./Sheet";
import { CopyIcon } from "./icons";
import { field, primaryButton } from "./Forms";

type Invite = { email: string; display_name: string };
type Grant = { client: { id: string; name: string }; scopes?: string[]; granted_at?: string };
type SheetState = { kind: "name" } | { kind: "invite" } | { kind: "delete" } | { kind: "connect" };

const CONNECTOR_PATH = "/api/mcp";

export function SettingsScreen() {
  const { members, me, email } = useHousehold();
  const prefs = usePrefs();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [grants, setGrants] = useState<Grant[] | undefined>();
  const [sheet, setSheet] = useState<SheetState>();
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const meMember = members.find((m) => m.userId === me);
  const isOwner = meMember?.role === "owner";
  // The address is this site's own origin, known only in the browser (server renders the path).
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const connectorUrl = `${origin}${CONNECTOR_PATH}`;

  const load = useCallback(async () => {
    if (!hasSupabase) return setGrants([]);
    const [inv, gr] = await Promise.all([supabase().rpc("list_invites"), supabase().auth.oauth.listGrants()]);
    if (!inv.error) setInvites((inv.data as Invite[]) ?? []);
    setGrants(gr.error ? [] : ((gr.data as unknown as Grant[]) ?? []));
  }, []);
  useEffect(() => {
    // Loading server state into the screen once it mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, done?: string) {
    const { error } = await fn();
    setNotice(error ? error.message : done);
    if (!error) {
      await Promise.all([load(), refreshHousehold()]);
    }
    return !error;
  }

  return (
    <Screen title="Settings">
      <Group>
        <Row>
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-full bg-ink text-[19px] font-semibold text-white">
              {(meMember?.name ?? email ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold">{meMember?.name ?? "You"}</div>
              <div className="truncate text-[14px] text-muted">{email}</div>
            </div>
          </div>
        </Row>
      </Group>

      {notice && (
        <p role="status" className="-my-3 px-4 text-[14px] text-ink-2">
          {notice}
        </p>
      )}

      <Group title="Account">
        <Row onClick={() => setSheet({ kind: "name" })} trailing={meMember?.name} chevron>
          <span className="text-[16px]">Name</span>
        </Row>
        <Row trailing={<span className="block max-w-48 truncate">{email}</span>}>
          <span className="text-[16px]">Email</span>
        </Row>
        <Row
          onClick={async () => {
            await supabase().auth.signOut();
            // A full load drops this session's in-memory store before the next person signs in.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/login");
          }}
        >
          <span className="text-[16px] text-accent">Sign out</span>
        </Row>
      </Group>

      <Group title="Household">
        {members.map((m) => (
          <Row
            key={m.userId}
            trailing={
              m.userId === me ? (
                <span className="text-[14px]">{m.role === "owner" ? "Owner · you" : "You"}</span>
              ) : isOwner ? (
                <button
                  className="text-[15px] text-danger"
                  onClick={() => run(() => supabase().rpc("remove_member", { p_user: m.userId }), `${m.name} removed.`)}
                >
                  Remove
                </button>
              ) : (
                <span className="text-[14px]">{m.role === "owner" ? "Owner" : "Member"}</span>
              )
            }
          >
            <span className="text-[16px]">{m.name}</span>
          </Row>
        ))}
        {invites.map((i) => (
          <Row
            key={i.email}
            trailing={
              <button className="text-[15px] text-danger" onClick={() => run(() => supabase().rpc("revoke_invite", { p_email: i.email }), "Invite revoked.")}>
                Revoke
              </button>
            }
          >
            <div className="text-[16px]">{i.display_name}</div>
            <div className="text-[13px] text-muted">Invited · {i.email}</div>
          </Row>
        ))}
        {members.length === 0 && invites.length === 0 && !isOwner && (
          <Row>
            <span className="text-[15px] text-muted">No household yet.</span>
          </Row>
        )}
        {isOwner && (
          <Row onClick={() => setSheet({ kind: "invite" })}>
            <span className="text-[16px] text-accent">Invite someone</span>
          </Row>
        )}
      </Group>

      <Group title="Claude">
        <Row
          trailing={
            <button
              aria-label="Copy connector address"
              className="press flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[14px] font-medium text-accent-ink"
              onClick={async () => {
                await navigator.clipboard.writeText(connectorUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              <CopyIcon size={15} />
              {copied ? "Copied" : "Copy"}
            </button>
          }
        >
          <div className="text-[16px]">Connector</div>
          <div className="tnum truncate text-[13px] text-muted">{connectorUrl}</div>
        </Row>
        <Row onClick={() => setSheet({ kind: "connect" })} chevron>
          <span className="text-[16px]">How to connect</span>
        </Row>
        {grants === undefined ? (
          <Row>
            <span className="text-[15px] text-muted">Checking…</span>
          </Row>
        ) : grants.length === 0 ? (
          <Row>
            <span className="text-[15px] text-muted">Not connected yet.</span>
          </Row>
        ) : (
          grants.map((g) => (
            <Row
              key={g.client.id}
              trailing={
                <button
                  className="text-[15px] text-danger"
                  onClick={() => run(() => supabase().auth.oauth.revokeGrant({ clientId: g.client.id }), `${g.client.name} disconnected.`)}
                >
                  Revoke
                </button>
              }
            >
              <div className="text-[16px]">{g.client.name}</div>
              <div className="text-[13px] text-ok">Connected{g.granted_at ? ` · since ${new Date(g.granted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</div>
            </Row>
          ))
        )}
      </Group>

      <Group title="Preferences">
        <Row
          trailing={
            <div role="radiogroup" aria-label="Time format" className="flex rounded-lg bg-soft p-0.5">
              {(["24h", "12h"] as const).map((f) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={prefs.timeFormat === f}
                  onClick={() => savePrefs({ timeFormat: f }).catch((e) => setNotice(e.message))}
                  className={`rounded-md px-3 py-1 text-[14px] ${prefs.timeFormat === f ? "bg-card font-semibold text-ink shadow-[var(--shadow-card)]" : "text-muted"}`}
                >
                  {f === "24h" ? "18:30" : "6:30 pm"}
                </button>
              ))}
            </div>
          }
        >
          <span className="text-[16px]">Time</span>
        </Row>
        <Row
          trailing={
            <select
              aria-label="Home currency"
              value={prefs.homeCurrency}
              onChange={(e) => savePrefs({ homeCurrency: e.target.value as Trip["currency"] }).catch((err) => setNotice(err.message))}
              className="rounded-lg bg-transparent py-1 text-right text-[16px] text-muted outline-none"
            >
              {(["EUR", "DKK", "GBP", "USD"] as const).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          }
        >
          <span className="text-[16px]">Home currency</span>
        </Row>
      </Group>

      <Group footer={isOwner && members.length > 1 ? "Remove the other members first to delete your account." : "Deletes your account and your sign-in. Trips stay with the household."}>
        <Row onClick={() => setSheet({ kind: "delete" })}>
          <span className="text-[16px] text-danger">Delete account</span>
        </Row>
      </Group>

      <Sheet open={!!sheet} onClose={() => setSheet(undefined)} label="Settings">
        {sheet?.kind === "name" && (
          <NameForm
            current={meMember?.name ?? ""}
            onSave={async (name) => {
              if (await run(() => supabase().rpc("update_my_name", { p_name: name }), "Name updated.")) window.history.back();
            }}
          />
        )}
        {sheet?.kind === "invite" && (
          <InviteForm
            onSave={async (mail, name) => {
              if (await run(() => supabase().rpc("invite_member", { p_email: mail, p_name: name }), `${name} can now sign in with ${mail}.`))
                window.history.back();
            }}
          />
        )}
        {sheet?.kind === "connect" && (
          <div className="flex flex-col gap-3 pr-10">
            <h3 className="text-[22px] font-bold tracking-[-0.02em]">Connect Claude</h3>
            <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-[16px] leading-relaxed text-ink-2">
              <li>In claude.ai, open Settings → Connectors.</li>
              <li>Add custom connector, name it spor, and paste the connector address.</li>
              <li>Sign in with your spor email and tap Allow.</li>
            </ol>
            <p className="text-[15px] text-muted">Everyone in the household connects their own Claude.</p>
          </div>
        )}
        {sheet?.kind === "delete" && (
          <div className="flex flex-col gap-3 pr-10">
            <h3 className="text-[22px] font-bold tracking-[-0.02em]">Delete your account?</h3>
            <p className="text-[15px] leading-relaxed text-ink-2">This removes your sign-in and can&rsquo;t be undone. Trips stay with the household.</p>
            <button
              className="press h-12 rounded-xl bg-danger text-[16px] font-semibold text-white"
              onClick={async () => {
                if (await run(() => supabase().rpc("delete_my_account"))) {
                  await supabase().auth.signOut();
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.assign("/login");
                } else window.history.back();
              }}
            >
              Delete account
            </button>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

function NameForm({ current, onSave }: { current: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(current);
  return (
    <form
      className="flex flex-col gap-3 pr-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <h3 className="text-[22px] font-bold tracking-[-0.02em]">Your name</h3>
      <label>
        <span className="sr-only">Name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={60} />
      </label>
      <button type="submit" disabled={!name.trim()} className={primaryButton}>
        Save
      </button>
    </form>
  );
}

function InviteForm({ onSave }: { onSave: (email: string, name: string) => void }) {
  const [mail, setMail] = useState("");
  const [name, setName] = useState("");
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim()) && name.trim().length > 0;
  return (
    <form
      className="flex flex-col gap-3 pr-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(mail.trim().toLowerCase(), name.trim());
      }}
    >
      <h3 className="text-[22px] font-bold tracking-[-0.02em]">Invite someone</h3>
      <label>
        <span className="sr-only">Name</span>
        <input autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={60} />
      </label>
      <label>
        <span className="sr-only">Email</span>
        <input type="email" inputMode="email" autoComplete="off" placeholder="Email" value={mail} onChange={(e) => setMail(e.target.value)} className={field} />
      </label>
      <button type="submit" disabled={!valid} className={primaryButton}>
        Invite
      </button>
    </form>
  );
}
