import type { Trip } from "./types";

type Pt = [number, number];

/**
 * Every trip's mapped stops as a polyline in a w×h box (equirectangular, longitude
 * scaled by the middle latitude so shapes aren't stretched), north up, one shared scale.
 */
export function projectRoutes(trips: Trip[], w: number, h: number, pad: number) {
  const raw = trips
    .map((t) => ({
      tripId: t.id,
      geo: t.days.flatMap((d) => d.stops).filter((s) => s.lat != null && s.lng != null).map((s) => [s.lat!, s.lng!] as Pt),
    }))
    .filter((r) => r.geo.length > 0);
  if (raw.length === 0) return { routes: [] as { tripId: string; points: Pt[] }[] };

  const lats = raw.flatMap((r) => r.geo.map(([la]) => la));
  const lngs = raw.flatMap((r) => r.geo.map(([, lo]) => lo));
  const k = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  const xs = lngs.map((lo) => lo * k);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...lats), Math.max(...lats)];
  const scale = Math.min((w - 2 * pad) / Math.max(x1 - x0, 1e-6), (h - 2 * pad) / Math.max(y1 - y0, 1e-6));
  const offX = (w - (x1 - x0) * scale) / 2;
  const offY = (h - (y1 - y0) * scale) / 2;

  return {
    routes: raw.map((r) => ({
      tripId: r.tripId,
      points: r.geo.map(([la, lo]) => [offX + (lo * k - x0) * scale, offY + (y1 - la) * scale] as Pt),
    })),
  };
}
