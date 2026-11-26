"use client";

import { getImageProps } from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safeNext";
import journey from "@/assets/photos/journey.jpg";
import london from "@/assets/photos/london.jpg";
import { LandmarkIcon } from "@/components/Destination";

const common = { alt: "", fill: true, loading: "eager", fetchPriority: "high" } as const;
const {
  props: { srcSet: wide },
} = getImageProps({ ...common, src: journey, sizes: "55vw" });
const { props: tall } = getImageProps({ ...common, src: london, sizes: "100vw", placeholder: "blur" });

type Status = "idle" | "sending" | "sent" | "error";

/** The route-with-two-stops mark from the app icon, drawn to sit on a photo. */
function Mark({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center justify-center rounded-[9px] bg-accent" style={{ width: size, height: size }}>
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 70 70" aria-hidden="true">
        <path d="M14 56 C 14 34, 56 40, 56 14" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        <circle cx="14" cy="56" r="8.5" fill="#fff" />
        <circle cx="56" cy="14" r="8" className="fill-accent" stroke="#fff" strokeWidth="5" />
      </svg>
    </span>
  );
}

/**
 * The front door: a window onto a journey, the sign-in in a sheet over it (phone) or beside it
 * (laptop). The photo settles in once; everything after that is the form.
 */
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
          <span className="text-[22px] font-bold tracking-[-0.03em] text-white">spor</span>
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
          {status === "sent" ? (
            <div aria-live="polite">
              <span className="flex size-12 items-center justify-center rounded-full bg-ok-soft text-ok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </svg>
              </span>
              <h1 className="mt-4 text-[26px] font-bold tracking-[-0.02em]">Check your email</h1>
              <p className="mt-1.5 text-[16px] leading-relaxed text-ink-2">
                The link for <b className="font-semibold text-ink">{email.trim().toLowerCase()}</b> signs you in on this device.
              </p>
              <button onClick={() => setStatus("idle")} className="press mt-5 text-[15px] font-medium text-accent">
                Use another email
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
              <h1 className="text-[26px] font-bold tracking-[-0.02em]">Sign in</h1>
              <p className="mt-1 text-[16px] text-ink-2">We&rsquo;ll email you a link. No password.</p>
              <form onSubmit={send} className="mt-5 flex flex-col gap-3">
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
                  className="h-12 rounded-xl border border-line bg-card px-4 text-[16px] text-ink outline-none transition-colors focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="press h-12 rounded-xl bg-accent text-[16px] font-semibold text-on-fill disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Email me a link"}
                </button>
                {status === "error" && (
                  <p role="alert" className="text-[14px] text-danger">
                    Couldn&rsquo;t send a link to that email. If you&rsquo;re new, ask whoever invited you to add it.
                  </p>
                )}
              </form>
              <p className="mt-6 text-[13px] text-muted">Private to your household. Everything stays behind sign-in.</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
