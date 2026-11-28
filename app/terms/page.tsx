import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms · tur" };

/** Public: linked from Google's sign-in screen, readable without an account. */
export default function Terms() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-12 text-[16px] leading-relaxed text-ink-2">
      <Link href="/login" className="text-[15px] font-medium text-accent">
        ← tur
      </Link>
      <h1 className="mt-6 text-[32px] font-bold tracking-[-0.02em] text-ink">Terms</h1>
      <p className="mt-1 text-[14px] text-muted">Last updated 28 November 2026</p>
      <p className="mt-6">
        tur is a personal project offered free and as is, without guarantees. Check times, bookings and travel details with the
        original provider before you rely on them. Use tur only for your own trips and the people you share them with, and don&rsquo;t
        use it to store anything unlawful. Access may change or end at any time; you can delete your account in Settings whenever you
        like. How your data is handled is described in the{" "}
        <Link href="/privacy" className="text-accent">
          privacy notice
        </Link>
        .
      </p>
    </main>
  );
}
