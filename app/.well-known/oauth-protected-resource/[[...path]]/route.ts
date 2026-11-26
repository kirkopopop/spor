import { AUTH_ISSUER, MCP_PATH } from "@/lib/mcp/auth";

// RFC 9728: tells claude.ai that tur's MCP endpoint is protected and that
// Supabase Auth is where to sign in. Served at the root and at /<resource path>.
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json(
    { resource: `${origin}${MCP_PATH}`, authorization_servers: [AUTH_ISSUER], bearer_methods_supported: ["header"] },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
