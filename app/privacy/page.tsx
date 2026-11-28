import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · tur" };

const CONTACT = "kirkopsubs@gmail.com";

/** Public: linked from Google's sign-in screen, readable without an account. */
export default function Privacy() {
  return (
    <main className="mx-auto max-w-[680px] px-6 py-12 text-[16px] leading-relaxed text-ink-2">
      <Link href="/login" className="text-[15px] font-medium text-accent">
        ← tur
      </Link>
      <h1 className="mt-6 text-[32px] font-bold tracking-[-0.02em] text-ink">Privacy</h1>
      <p className="mt-1 text-[14px] text-muted">Last updated 28 November 2026</p>

      <Section title="What tur is">
        tur is a small, private trip planner run by one person, Kirill Kopytov, for himself, his family and friends. It has no ads and
        sells nothing.
      </Section>

      <Section title="What we store">
        Your name and email address; the trips you create or that others share with you (days, stops, bookings, budgets, expenses
        and notes); the flights and places you log; and your settings. If you sign in with Google, tur receives only your name,
        email address and profile picture from Google, and keeps the name and email.
      </Section>

      <Section title="Who can see it">
        Your trips are private until you share them. People you share a trip with see that trip, its notes and expenses, and your
        name. Your flights and places are visible only to you, except a flight someone logged for you on a shared trip, which they
        can also see. If you connect Claude to tur, Claude reads and changes your trips on your behalf, with your permission.
      </Section>

      <Section title="Where it is kept">
        Data is stored with Supabase (database and sign-in, EU region, Ireland) and the app runs on Vercel. Walking routes are
        worked out by sending stop coordinates, without your name, to a public routing service (FOSSGIS OSRM). Nothing is sold or
        shared for advertising.
      </Section>

      <Section title="Your choices">
        From a trip&apos;s ⋯ menu you can delete a trip you own, which removes it with its days, stops, bookings, budget, expenses and
        notes for everyone it&apos;s shared with, or leave a trip shared with you. In Settings you can change your name and delete your
        account, which removes your sign-in, the trips you own, your flights and your places.
      </Section>

      <Section title="Contact">
        Questions or requests: <a href={`mailto:${CONTACT}`} className="text-accent">{CONTACT}</a>.
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[19px] font-semibold text-ink">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
