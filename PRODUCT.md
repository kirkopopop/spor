# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Phone-first progressive web app (installable to the home screen, works offline), used mostly on phones while planning and travelling; also opened on a laptop.

## Users

People who travel together, each with their own tur account: today Kirill and Tanya (with their baby Oscar), with friends and family added to single trips (e.g. a friend on a boys' trip, grandparents who follow along). Anyone can sign up; trips are shared one by one with specific people, who can edit or only view. Each person's flights and places been are their own.

Two situations:

- **Between trips** (most common): browsing all trips — what's coming up, ideas, past trips, where they've been — and preparing the next one (bookings left, open picks, budget).
- **During a trip**: on a phone in a city, often one-handed, sometimes offline: what's now and next, when to leave, ticking stops off, logging expenses and notes, split between two phones.

## Product Purpose

One private place where every trip lives and runs: plan in conversation with Claude, then read, adjust and run the plan in tur on both phones. Success: the plan is trustworthy on the day (correct leave-by times, works offline, both phones in step), and planning a trip with Claude ends with it already on both phones.

## Positioning

Planning happens in Claude, not in the app: tur is where the plan lives. Each traveller's own Claude reads and writes the trip through the tur connector (MCP), sees what the others changed (picks, ticks, notes, moved stops) and never overwrites them from a stale copy. The app itself has no AI chat; it is the calm, fast, offline-capable place to read, tweak and run the plan.

## Operating Context

- Places been: each person keeps the countries and cities they've visited on their own Overview globe. Ended tur trips count automatically for the people on them; earlier travel is logged by hand in a few taps.
- A trip moves through stages: Idea → Planning → Live → Memory. Memory is a recap tab on past trips (places reached, km on foot, spend, places not reached, the notes as a journal, the route as it happened); photos are not built yet.
- Planning: day timeline with stops, travel between stops with leave-by times, "Pick one" options, bookings checklist, budget, rain plan per day, spare-time ideas per city, notes.
- Live: Now/Next, tick stops, expenses split among the people on the trip, notes; offline with an edit queue that syncs.
- Hand edits in the app are light: pick an option, move a time, tick, add/edit/delete a stop, notes, expenses. Larger planning goes through Claude ("Ask Claude" links open claude.ai with the trip and day prefilled).
- Accounts: open sign-up with Google, email + password, or a magic link. A trip belongs to whoever created it; the owner shares it by email (can edit / can view). An email without an account gets the trip once it signs up and confirms that address. Flights can be logged for someone on a trip you can edit.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router, cache components), Supabase (Postgres with RLS, Auth, OAuth 2.1 server for the connector, Realtime), Vercel. Local-first client store in IndexedDB.
- Data per trip: days, stops (time, kind fixed/normal/optional, travel, options, booking link), bookings, budget lines, spare ideas, expenses, notes, activity log, revision.
- Sharing lives on each trip (Share sheet: people, access, pending invites, leave). Settings cover: Claude connector (URL, status, connected apps, revoke), account (name, email, password, sign out, delete account), preferences (home currency, units, time format, default timezone, theme).
- Open decisions (not built yet): invitations by link; invite emails sent by tur itself (today the owner tells the person); Memory photos (needs a private storage bucket); Places wishlist and Kit templates. Walking legs are routed by FOSSGIS's public OSRM (stop coordinates only); transit legs stay Claude's estimates.
- English-only UI.

## Brand Commitments

- Name: **tur** (Danish for trip; renamed from spor in Nov 2026), always lowercase; sits in a family of the user's apps (hjem, skarb, puls, ravn, kolo).
- Mark: a white suitcase (rolling case with two straps) on the accent blue; app icon, favicon and sign-in all use `app/turMark.tsx`.
- Voice: plain, short, calm. No instruction copy on screen; empty states are two or three words ("None yet.", "All booked."). Don't say anything twice.
- Status by styling, not words. The only status words: "To book", "Pick one" (or the picked option's name).
- The list answers "what and when"; the detail sheet answers "how and what if". The plan sits high on the first screen.
- References named by the user: Polarsteps (route map, rounded cards), the calm density of Kirill's earlier trip pages, Oura's premium, clean consumer-app feel ("familiar conventions done with care, not an invented visual world").
- **Standing visual preference (chosen 2026-11-26):** the category standard for travel apps, played straight and executed at full fidelity, with the map on top. Craft bar: Apple Maps / Weather (map with a sheet over it, native-feeling motion and type), Airbnb (clear trip detail screens, generous white space), Oura (calm premium overview, big numbers, quiet hierarchy). No invented visual world.

## Evidence on Hand

- Real trips: London, Glasgow & Edinburgh (19–22 Nov 2026, past; full plan) and Munich (21–25 Dec 2026, planning, empty so far).
- Mockup canvas with four phone screens (Home, Trip · Planning, Trip · Live, Bookings & budget): https://claude.ai/artifact/WvJ6FRt8iyDc7ciKaE6KHC
- Original handover: Kirill's `spor-handover.md` (UX rules, data model, phases).
- No testimonials, users beyond the household, or usage numbers exist; do not invent them.

## Product Principles

1. The plan must be right on the day: leave-by times, offline, both phones in step outrank everything else.
2. Claude plans; tur holds and runs the plan. The app never grows its own planning assistant.
3. Instant on a phone: everything reads from the phone's copy; the network only syncs.
4. Nobody's edit is lost: travellers' changes win over stale copies, every change is attributed.
5. Calm by default: one quiet line per stop, detail behind a tap, nothing nice-to-have above the plan.

## Accessibility & Inclusion

Used one-handed in the street, in sun and at night: large tap targets, readable contrast, works with reduced motion. No further product-specific standard set.
