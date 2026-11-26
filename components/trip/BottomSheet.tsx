"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";
const FRACTION: Record<Snap, number> = { peek: 0.3, half: 0.56, full: 0.92 };
const ORDER: Snap[] = ["peek", "half", "full"];

const WIDE = "(min-width: 900px)";
/** Laptop layout: the plan as a left half, the map as the right half. */
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * The sheet over the map, Apple Maps style: drag the top edge between peek, half and
 * full; the content scrolls inside. On wide screens it becomes a side panel instead.
 * Reports its visible height so the map can keep pins clear of it.
 */
export function BottomSheet({
  header,
  children,
  snap,
  onSnap,
  onHeight,
}: {
  header: ReactNode;
  children: ReactNode;
  snap: Snap;
  onSnap: (s: Snap) => void;
  onHeight?: (px: number) => void;
}) {
  const [vh, setVh] = useState(0);
  const wide = useWide();
  const [drag, setDrag] = useState<number | null>(null); // live height while dragging
  const start = useRef<{ y: number; h: number; t: number } | null>(null);

  useEffect(() => {
    const read = () => setVh(window.innerHeight);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const height = drag ?? Math.round(vh * FRACTION[snap]);
  useEffect(() => {
    if (vh) onHeight?.(wide ? 0 : height);
  }, [height, vh, wide, onHeight]);

  const onDown = (e: React.PointerEvent) => {
    if (wide) return;
    start.current = { y: e.clientY, h: height, t: e.timeStamp };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const h = Math.min(vh * 0.95, Math.max(vh * 0.18, start.current.h + (start.current.y - e.clientY)));
    setDrag(h);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || drag == null) return setDrag(null);
    const velocity = (s.y - e.clientY) / Math.max(1, e.timeStamp - s.t); // px/ms, up is positive
    let target: Snap;
    if (Math.abs(velocity) > 0.5) {
      const i = ORDER.indexOf(snap) + (velocity > 0 ? 1 : -1);
      target = ORDER[Math.min(ORDER.length - 1, Math.max(0, i))];
    } else {
      target = ORDER.reduce((best, k) => (Math.abs(vh * FRACTION[k] - drag) < Math.abs(vh * FRACTION[best] - drag) ? k : best), snap);
    }
    setDrag(null);
    onSnap(target);
  };

  if (wide) {
    return (
      <section aria-label="Trip" className="absolute top-4 bottom-4 left-4 z-20 flex w-[calc(50%-24px)] flex-col overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-float)]">
        <div className="shrink-0 px-5 pt-5">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    );
  }

  return (
    <section
      aria-label="Trip"
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[22px] bg-card shadow-[var(--shadow-sheet)]"
      style={{
        height: vh ? height : "56dvh",
        transition: drag == null ? "height 380ms cubic-bezier(.2,.9,.25,1)" : "none",
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="shrink-0 cursor-grab touch-none px-5 pt-2 active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label={snap === "full" ? "Shrink the sheet" : "Expand the sheet"}
          onClick={() => onSnap(snap === "full" ? "half" : ORDER[ORDER.indexOf(snap) + 1])}
          className="mx-auto mb-2 block h-5 w-12"
        >
          <span className="mx-auto block h-[5px] w-9 rounded-full bg-line" />
        </button>
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
    </section>
  );
}
