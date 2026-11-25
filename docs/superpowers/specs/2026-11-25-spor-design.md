# spor — design (2026-11-25)

Source of truth for intent: `spor-handover.md` (Kirill's handover from claude.ai). This doc records what was decided on top of it.

## Intent
One private app where every trip's plan lives and runs. Planning happens in conversation with Claude; Claude writes the plan into spor through an MCP connector. The app is for reading the plan, light hand edits, and running the trip live on two phones (Kirill and Tanya). Hard deadline: Munich, 21–25 Dec 2026.

## Timeline (decided: two days, prototype today)
- **Day 1 (today):** Next.js app with the handover's design tokens; London–Edinburgh trip imported from UkTrip `trip-data.js` as seed data; screens Home, Trip · Planning (day tabs, timeline, stop sheet), Trip · Bookings & budget; phone-first; deployed.
- **Day 2:** Supabase (schema + RLS + magic-link auth + household), MCP connector at `/api/mcp` with Supabase OAuth 2.1 server, Live view (Now/Next, ticks, picks, expenses, offline queue, PWA), updated "spor planning" skill.

## Approaches considered
- **Connector before Munich (chosen by Kirill):** Claude writes Munich into spor directly. Riskiest piece is OAuth; Supabase Auth's OAuth 2.1 server (beta) supports dynamic client registration as MCP needs.
- File import first, connector later: cheaper, rejected — connector is a must.

## Decisions
- Supabase: new project `spor` in org kirkopytovUA, eu-west-1, free tier. **Blocked:** both owner accounts are at the 2-free-project limit; Kirill frees a slot. Until then the prototype reads seed data through a single data-access module so the swap to Supabase touches one file.
- Code: `Desktop\spor`, git; GitHub `kirkopopop/spor` (Kirill creates the empty repo; gh CLI not installed).
- Sign-in: email magic link.
- Data model: as handover draft, except **no `legs` table** — travel to a stop lives on the stop (`go_mode`, `go_min`, `go_text`, `go_leave`, `go_est`), as UkTrip's `go`. Reordering stops can't orphan a leg.
- **Local-first (decided after review, 2026-11-25):** the phone keeps every trip and a queue of hand edits in IndexedDB (`lib/store.ts`); screens render from it, so taps never wait on the network and the plan reads offline. Edits are ops applied over the last snapshot (`lib/ops.ts`) and pushed when there is signal. A trip is one client screen; tabs and the day live in the URL (`?tab=book&day=2026-12-22`).
- Stop ids are uuids, never positional, so ticks/picks/expenses survive Claude rewriting a day. Times are `HH:MM` + `approx`, local to the trip's `timezone`; "today" is always computed in that timezone.
- Leave-by = the plan's own leave time, else time − travel − 15 min slack before fixed stops. The first stop's travel (from where you slept) is shown.
- Seed data contains phone numbers and booking notes → seed JSON is **gitignored**, never committed (handover: private refs only in DB).

## Cut until after Munich
Guest invites, Home route map + stats, Places, Kit, dark mode, photos/Memory, London import as a formal feature (it's only seed data today).

## Left to the builder
Component structure, icon set (stroke SVG, no emoji), exact sheet animation.
