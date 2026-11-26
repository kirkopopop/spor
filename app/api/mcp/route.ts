import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/lib/mcp/auth";
import { buildServer } from "@/lib/mcp/server";

// tur's MCP endpoint for claude.ai (streamable HTTP, stateless: one server per request,
// which suits serverless). Each request carries Claude's OAuth token for the person.
async function handle(req: Request) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const server = buildServer(auth.sb, auth.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
