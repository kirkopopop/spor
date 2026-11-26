"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isTrustedRedirect, redirectHost } from "@/lib/trustedClient";

// Supabase's OAuth server sends claude.ai's sign-in here (Authorization Path).
// Signed in already (the proxy guarantees it), so this only asks: let Claude in?
type Details = { id: string; client: string; host: string; trusted: boolean };
type State = { kind: "loading" } | { kind: "ask"; details: Details } | { kind: "busy" } | { kind: "error" };

export default function Consent() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("authorization_id");
    if (!id) return window.location.replace("/"); // opened directly, not from Claude
    supabase()
      .auth.oauth.getAuthorizationDetails(id)
      .then(({ data, error }) => {
        if (error || !data) return setState({ kind: "error" });
        // Already approved before: Supabase hands back where to continue (only ever to Claude).
        if (!("authorization_id" in data)) {
          return isTrustedRedirect(data.redirect_url) ? window.location.assign(data.redirect_url) : setState({ kind: "error" });
        }
        setState({
          kind: "ask",
          details: {
            id,
            client: data.client?.name || "An app",
            host: redirectHost(data.redirect_uri),
            trusted: isTrustedRedirect(data.redirect_uri),
          },
        });
      });
  }, []);

  async function decide(approve: boolean) {
    if (state.kind !== "ask") return;
    if (approve && !state.details.trusted) return; // never hand a code to anyone but Claude
    const id = state.details.id;
    setState({ kind: "busy" });
    const oauth = supabase().auth.oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : await oauth.denyAuthorization(id, { skipBrowserRedirect: true });
    if (error || !data?.redirect_url) return setState({ kind: "error" });
    window.location.assign(data.redirect_url);
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 pb-24">
      <h1 className="text-[40px] font-bold tracking-[-0.03em]">tur</h1>
      {state.kind === "error" && <p className="mt-6 text-[15px] text-ink-2">Link expired. Try again from Claude.</p>}
      {(state.kind === "loading" || state.kind === "busy") && <div className="mt-6 h-24" aria-busy="true" />}
      {state.kind === "ask" && (
        <>
          <p className="mt-6 text-[17px] leading-snug">
            <b className="font-semibold">{state.details.client}</b> wants to read and edit your trips.
          </p>
          <p className={`mt-2 text-sm ${state.details.trusted ? "text-muted" : "font-semibold text-danger"}`}>
            {state.details.trusted
              ? `Returns to ${state.details.host}.`
              : `Not Claude: it would send access to ${state.details.host}.`}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {state.details.trusted && (
              <button onClick={() => decide(true)} className="h-12 rounded-xl bg-accent text-[16px] font-semibold text-on-fill">
                Allow
              </button>
            )}
            <button onClick={() => decide(false)} className="h-12 rounded-xl bg-soft text-[16px]">
              Deny
            </button>
          </div>
        </>
      )}
    </main>
  );
}
