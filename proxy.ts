import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabase, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Everything is private: no session, no app. Also refreshes the session cookie on each visit.
// The connector endpoints check Claude's bearer token themselves, so they skip the cookie gate.
const PUBLIC = ["/login", "/auth/", "/api/mcp", "/.well-known/"];

export async function proxy(request: NextRequest) {
  if (!hasSupabase) {
    // Local prototype without a Supabase project: dev only, never in production.
    if (process.env.NODE_ENV === "production") return new NextResponse("Not configured", { status: 503 });
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await sb.auth.getClaims();
  const path = request.nextUrl.pathname;
  if (!data?.claims && !PUBLIC.some((p) => path.startsWith(p))) {
    if (path.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
    const login = new URL("/login", request.url);
    if (path !== "/") login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
