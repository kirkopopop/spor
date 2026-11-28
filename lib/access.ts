import type { Role, Trip } from "./types";

/** Your role on a trip; a trip on this phone without member rows (seed mode) is yours. */
export function roleOn(trip: Pick<Trip, "members" | "ownerId"> | undefined, me: string | undefined): Role | undefined {
  if (!trip) return undefined;
  if (!trip.members) return "owner";
  if (!me) return undefined;
  return trip.members.find((m) => m.userId === me)?.role ?? (trip.ownerId === me ? "owner" : undefined);
}

export const canEdit = (trip: Pick<Trip, "members" | "ownerId"> | undefined, me: string | undefined) => {
  const r = roleOn(trip, me);
  return r === "owner" || r === "editor";
};

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", editor: "Can edit", viewer: "Can view" };
