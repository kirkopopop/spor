import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

// The magic link lands here with a one-time code; swap it for a session cookie,
// then continue where sign-in started (e.g. Claude's consent screen).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const sb = await serverSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?expired=1", request.url));
}
