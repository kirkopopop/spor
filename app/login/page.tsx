"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safeNext";

type Status = "idle" | "sending" | "sent" | "error";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    const callback = new URL("/auth/callback", window.location.origin);
    if (next !== "/") callback.searchParams.set("next", next);
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callback.href },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 pb-24">
      <h1 className="text-[40px] font-bold tracking-[-0.03em]">spor</h1>
      {status === "sent" ? (
        <p className="mt-6 text-[15px] text-ink-2">Check your email.</p>
      ) : (
        <form onSubmit={send} className="mt-8 flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-line bg-card px-4 text-[16px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="h-12 rounded-xl bg-accent text-[16px] font-semibold text-on-fill disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send link"}
          </button>
          {status === "error" && <p className="text-sm text-danger">Not this email.</p>}
        </form>
      )}
    </main>
  );
}
