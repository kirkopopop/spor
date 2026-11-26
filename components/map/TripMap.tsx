"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { clusterPins } from "@/lib/pinClusters";
import { token, useTheme } from "@/lib/theme";

export type MapPin = { id: string; lat: number; lng: number; label: string; tone?: "default" | "fixed" | "done" | "next" };
/**
 * dashed: the order of stops, not a real path (transit legs, or before a walk is routed).
 * path: a real walking path along the streets. solid: the active leg, drawn over a casing.
 */
export type MapRoute = { id: string; points: [number, number][]; tone?: "accent" | "past"; style?: "solid" | "dashed" | "path" };

const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
const FALLBACK_CENTER: [number, number] = [10, 52]; // northern Europe, for a trip with no mapped stops yet
const KIND = { dashed: 0, path: 1, solid: 2 } as const;

/**
 * The map on top. MapLibre is loaded only where a map is shown; without signal the
 * tiles don't come but pins and the route still draw on the plain ground. Colours come
 * from the theme tokens, and the map is rebuilt with the night style when the theme flips.
 */
export function TripMap({
  pins = [],
  routes = [],
  selectedId,
  onSelect,
  interactive = true,
  padding = { top: 72, bottom: 72, left: 40, right: 40 },
  className = "",
  label,
}: {
  pins?: MapPin[];
  routes?: MapRoute[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  padding?: { top: number; bottom: number; left: number; right: number };
  className?: string;
  label: string;
}) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [gen, setGen] = useState(0); // bumps each time a map is built: pins and camera can go
  const [readyGen, setReadyGen] = useState(0); // the build whose style has loaded (or failed offline): lines can go
  const placed = useRef(false); // first fit jumps; later moves animate
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Build the map (again when the theme changes, for the matching style).
  useEffect(() => {
    let cancelled = false;
    let built = 0;
    (async () => {
      const ml = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      ml.setWorkerUrl("/maplibre-worker.mjs"); // copied into public/ by scripts/copy-maplibre-worker.mjs
      if (cancelled || !box.current) return;
      const m = new ml.Map({
        container: box.current,
        style: STYLE[theme],
        center: FALLBACK_CENTER,
        zoom: 3,
        interactive,
        // The small Overview card carries its own one-line credit (below) instead of the expanding box.
        attributionControl: interactive ? { compact: true } : false,
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 0,
      });
      m.touchZoomRotate?.disableRotation();
      map.current = m;
      placed.current = false;
      setGen((g) => {
        built = g + 1;
        return built;
      });
      const ready = () => !cancelled && setReadyGen(built);
      m.on("load", ready);
      m.on("error", ready); // offline: still draw what we have
      if (process.env.NODE_ENV !== "production") (window as unknown as { __turMap?: MlMap }).__turMap = m; // dev inspection
    })();
    return () => {
      cancelled = true;
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [interactive, theme]);

  // Routes: dashed for stop order, a thin solid line for real walking paths, and the active
  // leg solid on a casing.
  useEffect(() => {
    const m = map.current;
    if (!gen || readyGen !== gen || !m) return;
    const data = {
      type: "FeatureCollection" as const,
      features: routes
        .filter((r) => r.points.length > 1)
        .map((r) => ({
          type: "Feature" as const,
          properties: { color: token(r.tone === "past" ? "past" : "accent"), kind: KIND[r.style ?? "solid"] },
          geometry: { type: "LineString" as const, coordinates: r.points.map(([lat, lng]) => [lng, lat]) },
        })),
    };
    const src = m.getSource("tur-routes") as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(data); // returns the source; an effect may only return a cleanup
      return;
    }
    const line = { "line-join": "round", "line-cap": "round" } as const;
    try {
      m.addSource("tur-routes", { type: "geojson", data });
      m.addLayer({
        id: "tur-routes-dashed",
        type: "line",
        source: "tur-routes",
        filter: ["==", ["get", "kind"], KIND.dashed],
        layout: line,
        paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.5, "line-dasharray": [1.5, 2] },
      });
      m.addLayer({
        id: "tur-routes-path",
        type: "line",
        source: "tur-routes",
        filter: ["==", ["get", "kind"], KIND.path],
        layout: line,
        paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.55 },
      });
      m.addLayer({
        id: "tur-routes-casing",
        type: "line",
        source: "tur-routes",
        filter: ["==", ["get", "kind"], KIND.solid],
        layout: line,
        paint: { "line-color": token("card"), "line-width": 6, "line-opacity": 0.9 },
      });
      m.addLayer({
        id: "tur-routes",
        type: "line",
        source: "tur-routes",
        filter: ["==", ["get", "kind"], KIND.solid],
        layout: line,
        paint: { "line-color": ["get", "color"], "line-width": 3 },
      });
    } catch {
      // Style not available (offline): skip the lines, pins still show.
    }
  }, [gen, readyGen, routes]);

  // Camera: fit the day (or fly to the selected stop) whenever what's shown changes. Runs as soon as
  // the map exists, so it works offline or before the style arrives.
  useEffect(() => {
    const m = map.current;
    if (!gen || !m) return;
    const all: [number, number][] = [...pins.map((p) => [p.lat, p.lng] as [number, number]), ...routes.flatMap((r) => r.points)];
    const selected = pins.find((p) => p.id === selectedId);
    const animate = placed.current ? 1 : 0;
    placed.current = true;
    if (selected) {
      m.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(m.getZoom(), 14), padding, duration: 700 * animate });
    } else if (all.length === 1) {
      m.jumpTo({ center: [all[0][1], all[0][0]], zoom: 13, padding });
    } else if (all.length > 1) {
      const lats = all.map((p) => p[0]);
      const lngs = all.map((p) => p[1]);
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding, duration: 600 * animate, maxZoom: 14 },
      );
    }
    // padding is a fresh object each render; its numbers are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen, pins, routes, selectedId, padding.top, padding.bottom, padding.left, padding.right]);

  // Pins: redrawn after every camera move, with overlapping ones merged into one marker
  // that names its stops ("2–7"), so every row's number can be found on the map.
  useEffect(() => {
    const m = map.current;
    if (!gen || !m) return;
    let alive = true;
    let ml: typeof import("maplibre-gl") | undefined;
    const draw = () => {
      const lib = ml;
      if (!alive || !lib) return;
      markers.current.forEach((mk) => mk.remove());
      const c = { accent: token("accent"), fixed: token("fixed"), ok: token("ok"), ink: token("ink"), card: token("card"), onFill: token("on-fill"), onInk: token("on-ink") };
      const projected = pins.map((p) => ({ ...p, ...m.project([p.lng, p.lat]) }));
      const groups = clusterPins(projected, 28, selectedId);
      markers.current = groups.map((g) => {
        const members = pins.filter((p) => g.ids.includes(p.id));
        const one = members.length === 1 ? members[0] : undefined;
        const selected = one?.id === selectedId;
        const tone = one?.tone ?? (members.some((p) => p.tone === "next") ? "next" : "default");
        const color = tone === "fixed" ? c.fixed : tone === "done" ? c.ok : c.accent;
        const filled = selected || tone === "next";
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = g.label;
        el.setAttribute("aria-label", one ? `Stop ${g.label}` : `Stops ${g.label}, zoom in`);
        Object.assign(el.style, {
          minWidth: selected ? "34px" : "26px",
          height: selected ? "34px" : "26px",
          padding: one ? "0" : "0 8px",
          borderRadius: "999px",
          border: `2px solid ${c.card}`,
          // Merged markers are ink, so a group never reads as the next or selected (blue) stop.
          background: !one ? c.ink : filled ? color : c.card,
          color: !one ? c.onInk : filled ? c.onFill : color,
          font: `600 ${selected ? 14 : 12}px -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif`,
          fontVariantNumeric: "tabular-nums",
          boxShadow: "0 2px 6px rgba(0,0,0,.25)",
          cursor: onSelectRef.current ? "pointer" : "default",
          zIndex: selected ? "2" : "1",
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (one) return onSelectRef.current?.(one.id);
          const lats = members.map((p) => p.lat);
          const lngs = members.map((p) => p.lng);
          m.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: { ...padding, top: padding.top + 40, bottom: padding.bottom + 40 }, duration: 600, maxZoom: 17 },
          );
        });
        return new lib.Marker({ element: el }).setLngLat(m.unproject([g.x, g.y])).addTo(m);
      });
    };
    (async () => {
      ml = await import("maplibre-gl");
      draw();
    })();
    m.on("moveend", draw);
    return () => {
      alive = false;
      m.off("moveend", draw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen, pins, selectedId]);

  // MapLibre's stylesheet makes its own container position: relative, so the caller's
  // positioning lives on an outer box and the map fills it.
  return (
    <div role="img" aria-label={label} className={`bg-map ${className}`}>
      <div ref={box} className="h-full w-full" />
      {!interactive && (
        <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded-sm bg-card/95 px-1 text-[9px] text-muted">© OpenStreetMap · OpenFreeMap</span>
      )}
    </div>
  );
}
