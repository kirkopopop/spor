import { getTrips } from "@/lib/data";
import { hasSupabase } from "@/lib/supabase/env";

// Local prototype feed from gitignored seed files. Real trips come from Supabase
// (scoped by RLS); this route exists only in dev when no Supabase project is set.
export async function GET() {
  if (hasSupabase || process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  return Response.json(await getTrips());
}
