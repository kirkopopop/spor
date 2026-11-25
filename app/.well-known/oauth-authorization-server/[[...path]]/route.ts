import { SUPABASE_URL } from "@/lib/supabase/env";

// Fallback for clients that look for authorization-server metadata on the MCP
// server's own origin: hand back Supabase Auth's document unchanged.
export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`, { cache: "no-store" });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}
