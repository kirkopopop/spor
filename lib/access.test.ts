import { describe, expect, it } from "vitest";
import { canEdit, roleOn } from "./access";

const trip = {
  ownerId: "k",
  members: [
    { userId: "k", name: "Kirill", role: "owner" as const },
    { userId: "t", name: "Tanya", role: "editor" as const },
    { userId: "v", name: "Vera", role: "viewer" as const },
  ],
};

describe("trip access", () => {
  it("reads each person's role", () => {
    expect(roleOn(trip, "k")).toBe("owner");
    expect(roleOn(trip, "t")).toBe("editor");
    expect(roleOn(trip, "x")).toBeUndefined();
  });
  it("lets owners and editors change a trip, not viewers or strangers", () => {
    expect([canEdit(trip, "k"), canEdit(trip, "t"), canEdit(trip, "v"), canEdit(trip, "x"), canEdit(trip, undefined)]).toEqual([true, true, false, false, false]);
  });
  it("treats a trip without member rows (local prototype) as yours", () => {
    expect(canEdit({ ownerId: undefined, members: undefined }, undefined)).toBe(true);
  });
});
