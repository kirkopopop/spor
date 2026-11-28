"use client";

import { getImageProps } from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safeNext";
import journey from "@/assets/photos/journey.jpg";
import london from "@/assets/photos/london.jpg";
import { LandmarkIcon } from "@/components/Destination";
import { Suitcase } from "../turMark";

const common = { alt: "", fill: true, loading: "eager", fetchPriority: "high" } as const;
const {
  props: { srcSet: wide },
} = getImageProps({ ...common, src: journey, sizes: "55vw" });
const { props: tall } = getImageProps({ ...common, src: london, sizes: "100vw", placeholder: "blur" });

type Status = "idle" | "sending";
type Mode = "signin" | "signup" | "reset" | "link";
type Sent = "confirm" | "reset" | "link";

const TITLE: Record<Mode, string> = { signin: "Sign in", signup: "Create your account", reset: "Reset password", link: "Sign-in link" };
const SUB: Record<Mode, string> = {
  signin: "Welcome back.",
  signup: "Plan your own trips, and see the ones friends share with you.",
  reset: "We'll email you a link to choose a new password.",
  link: "We'll email you a link. No password needed.",
};
const ACTION: Record<Mode, string> = { signin: "Sign in", signup: "Create account", reset: "Send reset link", link: "Email me a link" };
const input = "h-12 w-full rounded-xl border border-line bg-card px-4 text-[16px] text-ink outline-none transition-colors focus:border-accent";

/** Supabase's auth errors, said plainly. */
function friendly(e: { message: string; code?: string }) {
  const m = e.message.toLowerCase();
  if (e.code === "invalid_credentials" || m.includes("invalid login")) return "That email and password don't match. Try again, or reset your password.";
  if (e.code === "email_not_confirmed" || m.includes("not confirmed")) return "Confirm your email first: the link is in your inbox.";
  if (e.code === "user_already_exists" || m.includes("already registered")) return "There's already an account with this email. Sign in instead.";
  if (e.code === "weak_password" || m.includes("password should")) return "Pick a longer password (8+ characters, not a common one).";
  if (e.code === "over_email_send_rate_limit" || m.includes("rate limit")) return "Too many emails just now. Wait a minute and try again.";
  return e.message;
}

/** Google's "G", in its own colours (required by Google's sign-in branding). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** The suitcase from the app icon, drawn to sit on a photo. */
function Mark({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center justify-center rounded-[9px] bg-accent text-accent" style={{ width: size, height: size }}>
      <Suitcase size={size * 0.8} accent="currentColor" />
    </span>
  );
}

/**
 * The front door: a window onto a journey, the sign-in in a sheet over it (phone) or beside it
 * (laptop). The photo settles in once; everything after that is the form.
 */
export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<Sent>();

  useEffect(() => {
    // A used or expired email link (or a cancelled Google sign-in) comes back here with ?expired=1.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).has("expired")) setError("That link has expired or was already used. Try again.");
  }, []);

  const mail = email.trim().toLowerCase();
  const next = () => safeNext(new URLSearchParams(window.location.search).get("next"));
  const callback = (to?: string) => {
    const url = new URL("/auth/callback", window.location.origin);
    const n = to ?? next();
    if (n !== "/") url.searchParams.set("next", n);
    return url.href;
  };
  const go = () => window.location.replace(next());

  async function attempt(action: () => Promise<void>) {
    setStatus("sending");
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setStatus("idle");
  }

  const google = () =>
    attempt(async () => {
      const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
      if (error) throw new Error(error.message.includes("not enabled") ? "Google sign-in isn't switched on yet." : error.message);
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void attempt(async () => {
      const sb = supabase();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: mail, password });
        if (error) throw new Error(friendly(error));
        return go();
      }
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: callback(), data: { display_name: name.trim() } },
        });
        if (error) throw new Error(friendly(error));
        if (data.session) return go(); // email confirmation switched off: signed in already
        return setSent("confirm");
      }
      if (mode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(mail, { redirectTo: callback("/auth/reset") });
        if (error) throw new Error(friendly(error));
        return setSent("reset");
      }
      const { error } = await sb.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: callback() } });
      if (error) throw new Error(friendly(error));
      setSent("link");
    });
  }

  const valid =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) &&
    (mode === "reset" || mode === "link" || password.length >= (mode === "signup" ? 8 : 1)) &&
    (mode !== "signup" || name.trim().length > 0);
  const switchTo = (m: Mode) => {
    setMode(m);
    setError(undefined);
  };

  return (
    <main className="relative flex min-h-dvh flex-col bg-[#120d0a] min-[900px]:grid min-[900px]:grid-cols-[1.15fr_1fr] min-[900px]:bg-bg">
      {/* The photo: full-bleed behind the sheet on a phone, an inset panel on a laptop. */}
      <section className="absolute inset-0 overflow-hidden min-[900px]:relative min-[900px]:m-4 min-[900px]:rounded-[28px]">
        {/* Art-directed: a tall street for a tall phone, the wide train window for a laptop. Only one downloads. */}
        <picture>
          <source media="(min-width: 900px)" srcSet={wide} sizes="55vw" />
          <img
            {...tall}
            alt="Travel: a London street at dusk, or a valley through a train window"
            className="absolute inset-0 h-full w-full object-cover object-[50%_58%] min-[900px]:object-[52%_42%] [animation:settle_2.4s_cubic-bezier(.16,1,.3,1)_both]"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45),transparent_28%,transparent_52%,rgb(0_0_0/0.55))]" />
        <div className="absolute top-[max(20px,env(safe-area-inset-top))] left-5 flex items-center gap-2.5 min-[900px]:top-7 min-[900px]:left-7">
          <Mark />
          <span className="text-[22px] font-bold tracking-[-0.03em] text-white">tur</span>
        </div>
        <p className="absolute right-5 bottom-[calc(min(46dvh,420px)+16px)] left-5 text-[34px] leading-[1.08] font-bold tracking-[-0.03em] text-balance text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] min-[900px]:right-auto min-[900px]:bottom-9 min-[900px]:left-8 min-[900px]:max-w-[13ch] min-[900px]:text-[48px] [animation:rise_700ms_200ms_cubic-bezier(.16,1,.3,1)_both]">
          Trips, planned and lived.
        </p>
        <span className="absolute top-[max(28px,calc(env(safe-area-inset-top)+8px))] right-4 text-[10px] text-white/65 min-[900px]:top-auto min-[900px]:right-5 min-[900px]:bottom-4">
          <span className="min-[900px]:hidden">Photo: Lachlan Gowen / Unsplash</span>
          <span className="hidden min-[900px]:inline">Photo: Abby Rurenko / Unsplash</span>
        </span>
      </section>

      {/* The sign-in: a sheet over the photo on a phone, its own column on a laptop. */}
      <section className="relative z-10 mt-auto rounded-t-[28px] bg-card px-6 pt-7 pb-[max(28px,env(safe-area-inset-bottom))] shadow-[var(--shadow-sheet)] [animation:sheet-up_520ms_120ms_cubic-bezier(.16,1,.3,1)_both] min-[900px]:mt-0 min-[900px]:flex min-[900px]:flex-col min-[900px]:justify-center min-[900px]:rounded-none min-[900px]:bg-transparent min-[900px]:px-16 min-[900px]:shadow-none min-[900px]:[animation:none]">
        <div className="mx-auto w-full max-w-[380px]">
          {sent ? (
            <div aria-live="polite">
              <span className="flex size-12 items-center justify-center rounded-full bg-ok-soft text-ok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </svg>
              </span>
              <h1 className="mt-4 text-[26px] font-bold tracking-[-0.02em]">Check your email</h1>
              <p className="mt-1.5 text-[16px] leading-relaxed text-ink-2">
                {sent === "confirm" ? "Confirm " : sent === "reset" ? "The link to choose a new password is on its way to " : "The link for "}
                <b className="font-semibold text-ink">{mail}</b>
                {sent === "confirm" ? " with the link we sent, and you're in. Trips shared with this email will be waiting." : sent === "link" ? " signs you in on this device." : "."}
              </p>
              <button
                onClick={() => {
                  setSent(undefined);
                  switchTo("signin");
                }}
                className="press mt-5 text-[15px] font-medium text-accent"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div aria-hidden="true" className="mb-5 flex gap-3 text-faint">
                {(["london", "munich", "paris", "rome", "amsterdam", "tokyo", "mountains"] as const).map((l, i) => (
                  <span key={l} className="[animation:rise_500ms_cubic-bezier(.16,1,.3,1)_both]" style={{ animationDelay: `${300 + i * 60}ms` }}>
                    <LandmarkIcon landmark={l} size={20} />
                  </span>
                ))}
              </div>
              <h1 className="text-[26px] font-bold tracking-[-0.02em]">{TITLE[mode]}</h1>
              <p className="mt-1 text-[16px] text-ink-2">{SUB[mode]}</p>

              {(mode === "signin" || mode === "signup") && (
                <>
                  <button
                    type="button"
                    onClick={google}
                    disabled={status === "sending"}
                    className="press mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-card text-[16px] font-semibold text-ink disabled:opacity-60"
                  >
                    <GoogleMark />
                    Continue with Google
                  </button>
                  <div className="my-4 flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
                    <span className="h-px flex-1 bg-divider" />
                    or
                    <span className="h-px flex-1 bg-divider" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className={`flex flex-col gap-3 ${mode === "signin" || mode === "signup" ? "" : "mt-5"}`}>
                {mode === "signup" && (
                  <label>
                    <span className="sr-only">Your name</span>
                    <input autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} />
                  </label>
                )}
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                />
                {(mode === "signin" || mode === "signup") && (
                  <label>
                    <span className="sr-only">Password</span>
                    <input
                      type="password"
                      required
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={input}
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={status === "sending" || !valid}
                  className="press h-12 rounded-xl bg-accent text-[16px] font-semibold text-on-fill disabled:opacity-60"
                >
                  {status === "sending" ? "One moment…" : ACTION[mode]}
                </button>
                {error && (
                  <p role="alert" className="text-[14px] text-danger">
                    {error}
                  </p>
                )}
              </form>

              <div className="mt-5 flex flex-col items-start gap-2 text-[15px]">
                {mode === "signin" && (
                  <>
                    <button onClick={() => switchTo("signup")} className="press font-medium text-accent">
                      New to tur? Create an account
                    </button>
                    <button onClick={() => switchTo("reset")} className="press text-ink-2">
                      Forgot your password?
                    </button>
                    <button onClick={() => switchTo("link")} className="press text-ink-2">
                      Email me a sign-in link instead
                    </button>
                  </>
                )}
                {mode !== "signin" && (
                  <button onClick={() => switchTo("signin")} className="press font-medium text-accent">
                    {mode === "signup" ? "Already have an account? Sign in" : "Back to sign in"}
                  </button>
                )}
              </div>
              <p className="mt-6 text-[13px] text-muted">Your trips stay private until you share them.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
