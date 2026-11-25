import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNext("/oauth/consent?authorization_id=abc")).toBe("/oauth/consent?authorization_id=abc");
  });

  it("refuses other sites and odd forms", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r//evil.example",
      "/.//evil.example",
      "/a/..//evil.example",
      "/%2e//evil.example",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
