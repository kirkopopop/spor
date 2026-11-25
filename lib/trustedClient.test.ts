import { describe, expect, it } from "vitest";
import { redirectHost, isTrustedRedirect } from "./trustedClient";

describe("isTrustedRedirect", () => {
  it("trusts Claude's own callback hosts over https", () => {
    expect(isTrustedRedirect("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isTrustedRedirect("https://claude.com/api/mcp/auth_callback")).toBe(true);
  });

  it("refuses look-alikes, other schemes and garbage", () => {
    for (const uri of [
      "https://claude.ai.evil.example/cb",
      "https://evilclaude.ai/cb",
      "http://claude.ai/cb",
      "https://claude.ai@evil.example/cb",
      "javascript:alert(1)",
      "not a url",
      undefined,
    ]) {
      expect(isTrustedRedirect(uri)).toBe(false);
    }
  });
});

describe("redirectHost", () => {
  it("shows the host a person will be sent to", () => {
    expect(redirectHost("https://claude.ai/api/mcp/auth_callback")).toBe("claude.ai");
    expect(redirectHost("nonsense")).toBe("an unknown address");
  });
});
