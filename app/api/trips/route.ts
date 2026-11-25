import { getTrips } from "@/lib/data";

// Snapshot feed for the phone's local store. Day 2: Supabase, scoped by RLS to the signed-in household.
export async function GET() {
  return Response.json(await getTrips());
}
