"use client";

import { useEffect, useMemo, useState } from "react";
import type { Airport, Flight } from "@/lib/flights";

type Geo = { features: { properties: { iso: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] } }[] };

const ASPECT = 1.8; // width / height of the card
const PAD = 6; // degrees around the routes

/** Points along the great circle from a to b ([lat, lng]), longitudes kept continuous. */
function arc(a: [number, number], b: [number, number], steps = 48): [number, number][] {
  const v = ([lat, lng]: [number, number]) => {
    const p = (lat * Math.PI) / 180;
    const l = (lng * Math.PI) / 180;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  };
  const [p, q] = [v(a), v(b)];
  const w = Math.acos(Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
  if (w < 1e-6) return [a, b];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * w) / Math.sin(w);
    const s2 = Math.sin(t * w) / Math.sin(w);
    const [x, y, z] = [s1 * p[0] + s2 * q[0], s1 * p[1] + s2 * q[1], s1 * p[2] + s2 * q[2]];
    let lng = (Math.atan2(y, x) * 180) / Math.PI;
    const prev = out[out.length - 1];
    if (prev) while (lng - prev[1] > 180) lng -= 360;
    if (prev) while (prev[1] - lng > 180) lng += 360;
    out.push([(Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI, lng]);
  }
  return out;
}

/**
 * Where a person flew, drawn flat: the routes as great circles in route blue over the countries
 * they've been to, framed to the flights (Europe for a European year, the world when it spans it).
 */
export function FlightMap({ flights, airports, been }: { flights: Flight[]; airports: Map<string, Airport>; been: Set<string> }) {
  const [geo, setGeo] = useState<Geo>();
  useEffect(() => {
    let live = true;
    import("@/assets/geo/countries-110m.json").then((m) => live && setGeo(m.default as unknown as Geo));
    return () => {
      live = false;
    };
  }, []);

  const routes = useMemo(() => {
    const seen = new Map<string, { a: Airport; b: Airport; n: number }>();
    for (const f of flights) {
      const a = airports.get(f.from);
      const b = airports.get(f.to);
      if (!a || !b) continue;
      const key = [f.from, f.to].sort().join("-");
      const r = seen.get(key);
      if (r) r.n++;
      else seen.set(key, { a, b, n: 1 });
    }
    return [...seen.values()].map((r) => ({ ...r, points: arc([r.a[4], r.a[5]], [r.b[4], r.b[5]]) }));
  }, [flights, airports]);

  const frame = useMemo(() => {
    const pts = routes.flatMap((r) => r.points);
    if (pts.length === 0) return undefined;
    let [minLat, maxLat, minLng, maxLng] = [90, -90, 540, -540];
    for (const [lat, lng] of pts) [minLat, maxLat, minLng, maxLng] = [Math.min(minLat, lat), Math.max(maxLat, lat), Math.min(minLng, lng), Math.max(maxLng, lng)];
    const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180); // shrink longitude like the real map
    let [x0, x1, y0, y1] = [(minLng - PAD) * k, (maxLng + PAD) * k, -(maxLat + PAD), -(minLat - PAD)];
    // At least a region's worth of map, at the card's shape.
    const w = Math.max(x1 - x0, 36, (y1 - y0) * ASPECT);
    const h = w / ASPECT;
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
    [x0, x1, y0, y1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2];
    return { k, x0, y0, w, h };
  }, [routes]);

  const land = useMemo(() => {
    if (!geo || !frame) return [];
    const { k, x0, y0, w, h } = frame;
    const ring = (r: number[][]) => `M${r.map(([lng, lat]) => `${(lng * k).toFixed(2)},${(-lat).toFixed(2)}`).join("L")}Z`;
    const near = (r: number[][]) => r.some(([lng, lat]) => lng * k > x0 - w && lng * k < x0 + 2 * w && -lat > y0 - h && -lat < y0 + 2 * h);
    return geo.features.flatMap((f) => {
      const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
      const d = polys.flatMap((p) => (near(p[0]) ? p.map(ring) : [])).join("");
      return d ? [{ iso: f.properties.iso, d }] : [];
    });
  }, [geo, frame]);

  if (!frame) return null;
  const { k, x0, y0, w, h } = frame;
  const unit = w / 300; // one card pixel or so, in map degrees
  const ports = new Map(routes.flatMap((r) => [r.a, r.b]).map((a) => [a[0], a]));
  // Labels for the busiest airports first; one that would overlap a placed label is left off.
  const uses = (code: string) => routes.reduce((n, r) => n + (r.a[0] === code || r.b[0] === code ? r.n : 0), 0);
  const labelled = new Set<string>();
  const boxes: [number, number, number, number][] = [];
  for (const a of [...ports.values()].sort((p, q) => uses(q[0]) - uses(p[0]))) {
    const left = a[5] * k > x0 + w * 0.82;
    const bx = left ? a[5] * k - unit * 30 : a[5] * k + unit * 4;
    const box: [number, number, number, number] = [bx, -a[4] - unit * 6, bx + unit * 26, -a[4] + unit * 6];
    if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    boxes.push(box);
    labelled.add(a[0]);
  }

  return (
    <svg
      viewBox={`${x0} ${y0} ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Map of ${routes.length} ${routes.length === 1 ? "route" : "routes"}`}
      className="block aspect-[1.8] w-full bg-map"
    >
      <g strokeWidth={0.6} vectorEffect="non-scaling-stroke">
        {land.map((c) => (
          <path
            key={c.iso}
            d={c.d}
            className={been.has(c.iso) ? "fill-accent-soft stroke-accent/25" : "fill-card stroke-line"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {routes.map((r, i) => (
        <path
          key={`${r.a[0]}-${r.b[0]}`}
          d={`M${r.points.map(([lat, lng]) => `${(lng * k).toFixed(3)},${(-lat).toFixed(3)}`).join("L")}`}
          // Scaled with the map, not non-scaling: browsers measure pathLength dashes wrongly then.
          pathLength={1}
          fill="none"
          className="stroke-accent"
          strokeWidth={unit * (r.n > 1 ? 2.25 : 1.6)}
          strokeLinecap="round"
          strokeDasharray="1 1"
          style={{ animation: `draw 900ms cubic-bezier(.16,1,.3,1) ${Math.min(i * 60, 600)}ms both` }}
        >
          <title>{`${r.a[0]} – ${r.b[0]}${r.n > 1 ? ` · ${r.n} flights` : ""}`}</title>
        </path>
      ))}
      {[...ports.values()].map((a) => {
        // Labels sit right of the dot, or left of it near the right edge, so they stay on the card.
        const left = a[5] * k > x0 + w * 0.82;
        return (
        <g key={a[0]}>
          <circle cx={a[5] * k} cy={-a[4]} r={unit * 3.2} className="fill-card stroke-ink" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
            <title>{`${a[0]} · ${a[2] || a[1]}`}</title>
          </circle>
          {labelled.has(a[0]) && (
            <text
              x={a[5] * k + unit * (left ? -6 : 6)}
              y={-a[4] + unit * 3.6}
              textAnchor={left ? "end" : "start"}
              fontSize={unit * 10.5}
              fontWeight={600}
              className="fill-ink-2 [paint-order:stroke] stroke-map"
              strokeWidth={unit * 2.5}
            >
              {a[0]}
            </text>
          )}
        </g>
        );
      })}
    </svg>
  );
}
