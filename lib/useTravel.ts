"use client";

import { useCallback, useMemo } from "react";
import { canEdit } from "./access";
import { flightPlaces, type Flight } from "./flights";
import { useFlights } from "./flightsStore";
import { beenBy, tripPlaces, type Been } from "./places";
import { usePlaces } from "./placesStore";
import { usePeople, useTrips } from "./store";
import type { Member } from "./types";

/**
 * Where the signed-in person has been and flown: what they logged, their ended trips (matched by
 * first name, so a trip they only planned or watch doesn't count) and the countries they flew to.
 * The globe and the travel stats read the same sets, so their counts always agree. Each account's
 * flights and places are its own; `companions` are the people they may log a flight for.
 */
export function useTravel(today: string) {
  const { trips } = useTrips();
  const { members, me } = usePeople();
  const { rows } = usePlaces();
  const { flights } = useFlights();

  const myName = members.find((m) => m.userId === me)?.name;
  const people = useMemo<Member[]>(() => [{ userId: me ?? "", name: myName ?? "" }], [me, myName]);
  // Flights you logged for a companion come back too; your stats count only your own.
  const mine = useMemo(() => flights.filter((f) => !f.userId || f.userId === me), [flights, me]);
  const been = useMemo(
    () => beenBy(me, rows, [...tripPlaces(trips, today, myName), ...flightPlaces(mine)]),
    [me, rows, trips, today, myName, mine],
  );
  // You, then everyone on a trip you can edit (one booking often covers both).
  const companions = useMemo<Member[]>(() => {
    const out: Member[] = [{ userId: me ?? "", name: "Me" }];
    for (const t of trips) {
      if (!canEdit(t, me)) continue;
      for (const m of t.members ?? []) if (!out.some((o) => o.userId === m.userId)) out.push({ userId: m.userId, name: m.name.split(" ")[0] || m.name });
    }
    return out;
  }, [trips, me]);

  const isMe = useCallback((userId?: string) => (userId ?? "") === (me ?? ""), [me]);
  const beenOf = useCallback((userId?: string): Been => (isMe(userId) ? been : { countries: new Set(), cities: [] }), [been, isMe]);
  const flightsOf = useCallback((userId?: string): Flight[] => (isMe(userId) ? mine : []), [mine, isMe]);
  const nameOf = useCallback((userId?: string) => members.find((m) => m.userId === userId)?.name, [members]);

  return { trips, people, companions, me, rows, beenOf, flightsOf, nameOf };
}
