"use client";

import { useCallback, useMemo } from "react";
import { flightPlaces, type Flight } from "./flights";
import { useFlights } from "./flightsStore";
import { beenBy, tripPlaces, type Been } from "./places";
import { usePlaces } from "./placesStore";
import { useHousehold, useTrips } from "./store";

/**
 * Where each person in the household has been and flown: what they logged, their ended trips
 * (matched by first name) and the countries they flew to. The globe and the travel stats read
 * the same sets, so their counts always agree.
 */
export function useTravel(today: string) {
  const { trips } = useTrips();
  const { members, me } = useHousehold();
  const { rows } = usePlaces();
  const { flights } = useFlights();

  const people = useMemo(() => (members.length ? members : [{ userId: me ?? "", name: "" }]), [members, me]);
  const flightsByUser = useMemo(() => {
    const m = new Map<string, Flight[]>();
    for (const f of flights) m.set(f.userId ?? me ?? "", [...(m.get(f.userId ?? me ?? "") ?? []), f]);
    return m;
  }, [flights, me]);
  const beenByUser = useMemo(
    () =>
      new Map(
        people.map((p) => {
          const name = members.find((m) => m.userId === p.userId)?.name;
          const counted = [...tripPlaces(trips, today, name), ...flightPlaces(flightsByUser.get(p.userId) ?? [])];
          return [p.userId, beenBy(p.userId || undefined, rows, counted)] as const;
        }),
      ),
    [people, members, rows, trips, today, flightsByUser],
  );

  const beenOf = useCallback((userId?: string): Been => beenByUser.get(userId ?? "") ?? { countries: new Set(), cities: [] }, [beenByUser]);
  const flightsOf = useCallback((userId?: string): Flight[] => flightsByUser.get(userId ?? "") ?? [], [flightsByUser]);
  const nameOf = useCallback((userId?: string) => members.find((m) => m.userId === userId)?.name, [members]);

  return { trips, people, me, rows, beenOf, flightsOf, nameOf };
}
