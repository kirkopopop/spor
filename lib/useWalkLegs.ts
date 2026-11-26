"use client";

import { useEffect, useMemo, useState } from "react";
import { createStore, getMany, set } from "idb-keyval";
import type { Day } from "./types";
import { legFromOsrm, walkRequests, walkUrl, type Leg } from "./walkLegs";

// Walks never change, so a routed one is kept on this device for good: the map works offline
// and the free service is asked once per walk. A failure is remembered only for this visit.
const idb = typeof indexedDB === "undefined" ? undefined : createStore("spor-walks", "legs");
const memory = new Map<string, Leg | null>();

async function route(key: string, from: [number, number], to: [number, number]) {
  try {
    const res = await fetch(walkUrl(from, to));
    const leg = res.ok ? legFromOsrm(await res.json()) : undefined;
    memory.set(key, leg ?? null);
    if (leg && idb) await set(key, leg, idb).catch(() => {});
  } catch {
    memory.set(key, null); // offline or refused: the estimate and the dash stay
  }
}

/** Real walking paths and times for these days, by the stop each walk leads into. */
export function useWalkLegs(days: (Day | undefined)[]): Map<string, Leg> {
  const requests = useMemo(() => days.flatMap((d) => (d ? walkRequests(d) : [])), [days]);
  const signature = requests.map((r) => r.key).join("|");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const unknown = requests.filter((r) => !memory.has(r.key));
      if (!unknown.length) return;
      if (idb) {
        const cached = await getMany<Leg | undefined>(unknown.map((r) => r.key), idb).catch(() => []);
        unknown.forEach((r, i) => cached[i] && memory.set(r.key, cached[i]!));
      }
      if (!cancelled) setVersion((v) => v + 1); // show what this phone already knew
      // One at a time, politely: it is a free public service.
      for (const r of unknown.filter((r) => !memory.has(r.key))) {
        if (cancelled) return;
        await route(r.key, r.from, r.to);
      }
      if (!cancelled) setVersion((v) => v + 1); // the rest in one go, so the map doesn't jitter
    })();
    return () => {
      cancelled = true;
    };
    // signature captures the requests' content; the array itself is rebuilt each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return useMemo(() => {
    const out = new Map<string, Leg>();
    for (const r of requests) {
      const leg = memory.get(r.key);
      if (leg) out.set(r.stopId, leg);
    }
    return out;
    // version marks when the module-level cache has new answers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, version]);
}
