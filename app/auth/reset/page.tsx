"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { field, primaryButton } from "@/components/Forms";

/** Lands here from the reset email (already signed in by the callback): choose a new password. */
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const { error } = await supabase().auth.updateUser({ password });
    if (error) {
      setError(error.message.toLowerCase().includes("session") ? "That reset link has expired. Ask for a new one from the sign-in page." : error.message);
      setBusy(false);
      return;
    }
    window.location.replace("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <form onSubmit={save} className="flex w-full max-w-[380px] flex-col gap-3">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">Choose a new password</h1>
        <label>
          <span className="sr-only">New password</span>
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            placeholder="New password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <button type="submit" disabled={busy || password.length < 8} className={primaryButton}>
          {busy ? "Saving…" : "Save and sign in"}
        </button>
        {error && (
          <p role="alert" className="text-[14px] text-danger">
            {error}
          </p>
        )}
        <a href="/login" className="mt-2 text-[15px] text-accent">
          Back to sign in
        </a>
      </form>
    </main>
  );
}
