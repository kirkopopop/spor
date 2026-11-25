/**
 * Only same-site paths survive a ?next= redirect, so a link can't bounce you to another site.
 * Checks the parsed URL, not just the string: browsers drop tabs and newlines, so
 * "/\t/evil.example" would otherwise become "//evil.example".
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || /[\u0000-\u001F\u007F\\]/.test(next) || !next.startsWith("/") || next.startsWith("//")) return fallback;
  try {
    const base = "http://local.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    // Normalising can still yield "//host" (e.g. "/.//evil.example"): check the result too.
    const out = url.pathname + url.search + url.hash;
    if (!out.startsWith("/") || out.startsWith("//") || out.startsWith("/\\")) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
