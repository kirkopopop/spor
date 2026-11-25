"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
            className="h-12 rounded-[14px] border border-line bg-card px-4 text-[16px] outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="h-12 rounded-[14px] bg-ink text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send link"}
          </button>
          {status === "error" && <p className="text-sm text-accent-ink">Not this email.</p>}
        </form>
      )}
    </main>
  );
}
