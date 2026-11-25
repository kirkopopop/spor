# spor

One private app to plan and run our trips. Claude writes the plan in; the app shows it and runs it on the day.
Design and decisions: [docs/superpowers/specs/2026-11-25-spor-design.md](docs/superpowers/specs/2026-11-25-spor-design.md).

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test
```

Without Supabase settings the app runs in dev on the trips in `data/seed/*.json` (gitignored, private).

## Supabase

1. In the project's SQL editor, run `supabase/migrations/20261125120000_init.sql` (schema, access rules, sign-up allowlist, realtime).
2. Load trips: `node scripts/seed-sql.ts <your-email>` writes `data/seed/seed.sql`; run it in the SQL editor.
   It creates the household and lets only that email sign up.
3. Auth → URL configuration: add `http://localhost:3000/auth/callback` (and the Vercel URL later) to Redirect URLs.
4. `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

## Claude connector

claude.ai writes plans into spor through the MCP endpoint `https://spor-pi.vercel.app/api/mcp`.
Supabase Auth is the OAuth server; tools run as the signed-in person, so RLS applies.

1. Supabase → Authentication → URL Configuration: Site URL `https://spor-pi.vercel.app`;
   Redirect URLs `https://spor-pi.vercel.app/**` and `http://localhost:3000/**`.
2. Supabase → Authentication → OAuth Server: enable it, Authorization Path `/oauth/consent`,
   allow dynamic client registration.
3. claude.ai → Settings → Connectors → Add custom connector → `https://spor-pi.vercel.app/api/mcp`.

Tools: `list_trips`, `get_trip`, `get_activity_since`, `create_trip`, `update_trip`, `upsert_days`,
`upsert_stops`, `delete_stops`, `upsert_bookings`, `set_budget`, `upsert_spare_ideas`.

## Importing a UkTrip-format trip

```bash
node scripts/import-uktrip.ts path/to/trip-data.js data/seed/<name>.json memory
```
