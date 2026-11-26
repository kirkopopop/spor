"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MlMap, Marker } from "maplibre-gl";
import type { Destination } from "@/lib/destination";
import { token, useTheme } from "@/lib/theme";
import { DestinationMark } from "../Destination";
import type { MapRoute } from "./TripMap";

export type GlobePin = { id: string; lat: number; lng: number; destination: Destination; done: boolean; name: string };

const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
const SPIN = 2.4; // degrees of longitude per second while idle: a slow turn, west to east like the Earth

/** The zoom at which the whole globe fills this share of the card's shorter side. */
function fitZoom(box: HTMLElement, share = 0.8) {
  const d = Math.min(box.clientWidth, box.clientHeight) * share;
  return Math.log2((d * Math.PI) / 512); // the equator is 512·2^z px around, so the disc is that over π
}

/**
 * Every trip on a globe you can turn: planned ones ringed blue, done ones green (the app's status
 * tones), each wearing its destination's landmark. It turns slowly until touched, then stays put.
 */
export function Globe({
  pins,
  routes = [],
  selectedId,
  onSelect,
  focus,
  className = "",
}: {
  pins: GlobePin[];
  routes?: MapRoute[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  focus?: [number, number]; // where to face first: the next trip
  className?: string;
}) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [gen, setGen] = useState(0);
  const [readyGen, setReadyGen] = useState(0);
  const [faces, setFaces] = useState<{ id: string; el: HTMLElement }[]>([]);
  const touched = useRef(false); // the person has moved the globe: stop turning it for them
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Build the globe (again when the theme flips, for the matching style).
  useEffect(() => {
    let cancelled = false;
    let built = 0;
    (async () => {
      const ml = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      ml.setWorkerUrl("/maplibre-worker.mjs");
      if (cancelled || !box.current) return;
      const m = new ml.Map({
        container: box.current,
        style: STYLE[theme],
        center: focus ? [focus[1], focus[0]] : [10, 48],
        zoom: fitZoom(box.current),
        minZoom: fitZoom(box.current, 0.55),
        maxZoom: 9,
        attributionControl: false, // added top-right below, clear of the card's own text at the bottom
        scrollZoom: false, // the page scrolls past it; zoom with pinch, double-tap or the buttons
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: 0,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new ml.AttributionControl({ compact: true }), "top-right");
      const stop = () => {
        touched.current = true;
      };
      m.on("mousedown", stop);
      m.on("touchstart", stop);
      m.on("load", () => {
        if (cancelled) return;
        m.setProjection({ type: "globe" });
        // A thin atmosphere when the whole globe shows, gone as you zoom in.
        m.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] });
        setReadyGen(built);
      });
      m.on("error", () => !cancelled && setReadyGen(built));
      // MapLibre opens the compact credit as each source's data arrives and folds it on the first drag.
      // Fold it to its ⓘ until the person touches the globe; after that, theirs to open.
      m.on("sourcedata", () => {
        if (!touched.current) box.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
      });
      m.on("click", (e) => {
        // A tap on the globe itself (not a pin) puts the selection down.
        if (!(e.originalEvent.target as HTMLElement).closest("[data-globe-pin]")) onSelectRef.current(undefined);
      });
      map.current = m;
      setGen((g) => (built = g + 1));
      if (process.env.NODE_ENV !== "production") (window as unknown as { __sporGlobe?: MlMap }).__sporGlobe = m; // dev inspection
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // focus only seeds the first view; it doesn't rebuild the globe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Pins: one marker per trip, its face rendered by React into the marker's element.
  useEffect(() => {
    const m = map.current;
    if (!gen || !m) return;
    let markers: Marker[] = [];
    let alive = true;
    (async () => {
      const ml = await import("maplibre-gl");
      if (!alive) return;
      const made = pins.map((p) => {
        const el = document.createElement("div");
        el.dataset.globePin = p.id;
        markers.push(new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m));
        return { id: p.id, el };
      });
      setFaces(made);
    })();
    return () => {
      alive = false;
      markers.forEach((mk) => mk.remove());
      markers = [];
    };
  }, [gen, pins]);

  // Past trips' routes, thin, in their tones.
  useEffect(() => {
    const m = map.current;
    if (!gen || readyGen !== gen || !m) return;
    const data = {
      type: "FeatureCollection" as const,
      features: routes
        .filter((r) => r.points.length > 1)
        .map((r) => ({
          type: "Feature" as const,
          properties: { color: token(r.tone === "past" ? "ok" : "accent") },
          geometry: { type: "LineString" as const, coordinates: r.points.map(([lat, lng]) => [lng, lat]) },
        })),
    };
    const src = m.getSource("globe-routes") as { setData?: (d: unknown) => void } | undefined;
    if (src?.setData) {
      src.setData(data);
      return;
    }
    try {
      m.addSource("globe-routes", { type: "geojson", data });
      m.addLayer({
        id: "globe-routes",
        type: "line",
        source: "globe-routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.75 },
      });
    } catch {
      // Offline: no style, no lines; the pins still show.
    }
  }, [gen, readyGen, routes]);

  // Selecting a trip turns the globe to it and leans in; putting it down pulls back to the whole globe.
  const leaned = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !box.current) return;
    const p = pins.find((x) => x.id === selectedId);
    if (p) {
      touched.current = true;
      leaned.current = true;
      m.flyTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 3.4), duration: 1400, essential: false });
    } else if (leaned.current) {
      leaned.current = false;
      m.easeTo({ zoom: fitZoom(box.current), duration: 1100, essential: false });
    }
  }, [selectedId, pins]);

  // The idle turn: until someone touches the globe, and never with reduced motion.
  useEffect(() => {
    const m = map.current;
    if (!gen || !m || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!touched.current && !m.isMoving()) {
        const c = m.getCenter();
        m.jumpTo({ center: [c.lng - SPIN * dt, c.lat] }); // the view drifts west, so the land moves east
      }
      raf = requestAnimationFrame(step); // pauses by itself when the tab is hidden
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gen]);

  return (
    <div className={className}>
      <div ref={box} className="h-full w-full" aria-label="Globe of your trips" role="application" />
      {faces.map(({ id, el }) => {
        const p = pins.find((x) => x.id === id);
        if (!p) return null;
        const selected = p.id === selectedId;
        return createPortal(
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected ? undefined : p.id);
            }}
            aria-label={`${p.name}${p.done ? ", done" : ", planned"}`}
            aria-pressed={selected}
            className={`block rounded-[14px] bg-card p-[3px] shadow-[0_3px_10px_rgb(0_0_0/0.28)] ring-2 transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] ${
              p.done ? "ring-ok" : "ring-accent"
            } ${selected ? "scale-[1.25]" : "hover:scale-110"}`}
          >
            <DestinationMark destination={p.destination} size={30} />
          </button>,
          el,
        );
      })}
    </div>
  );
}
