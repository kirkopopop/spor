// Dynamic client registration lets any app call itself "Claude". What can't be faked is
// where approval sends you: only Claude's own hosts may receive tur's authorization codes.
const TRUSTED_HOSTS = new Set(["claude.ai", "claude.com"]);

export function isTrustedRedirect(uri: string | undefined): boolean {
  try {
    const url = new URL(uri ?? "");
    return url.protocol === "https:" && !url.username && TRUSTED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function redirectHost(uri: string | undefined): string {
  try {
    return new URL(uri ?? "").hostname || "an unknown address";
  } catch {
    return "an unknown address";
  }
}
