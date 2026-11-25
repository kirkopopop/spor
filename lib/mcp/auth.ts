import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export const MCP_PATH = "/api/mcp";
export const AUTH_ISSUER = `${SUPABASE_URL}/auth/v1`;

/** Where the RFC 9728 protected-resource document for the MCP endpoint lives. */
export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`;

/**
 * Checks Claude's bearer token (issued by Supabase's OAuth server) and returns a
 * Supabase client acting as that person, so RLS applies to every tool call.
 */
export async function authenticate(req: Request): Promise<{ sb: SupabaseClient; userId: string } | Response> {
  const origin = new URL(req.url).origin;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const challenge = (error?: string) =>
    new Response(JSON.stringify({ error: error ?? "unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${resourceMetadataUrl(origin)}"${error ? `, error="${error}"` : ""}`,
      },
    });
  if (!token) return challenge();

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub || data.claims.role !== "authenticated") return challenge("invalid_token");
  return { sb, userId: sub };
}
