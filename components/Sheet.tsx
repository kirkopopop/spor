"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Close } from "./icons";

const DISMISS_PX = 110; // drag distance that closes
const DISMISS_SPEED = 0.6; // px/ms flick that closes

/**
 * Slide-up sheet, phone style. Opening adds a history entry, so the phone's
 * Back gesture closes the sheet instead of leaving the screen. Drag it down
 * (from the top, or anywhere when its content is scrolled to the top) to close.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Back closes the sheet; closing by tap pops the entry we pushed.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...window.history.state, turSheet: true }, "");
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && window.history.back();
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => {
    if (window.history.state?.turSheet) window.history.back();
    else onCloseRef.current();
  };

  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((panel.current?.scrollTop ?? 0) > 0) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (d.dy > 4) panel.current?.setPointerCapture(e.pointerId);
    setDy(d.dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    const speed = d.dy / Math.max(1, e.timeStamp - d.t);
    setDy(0);
    if (d.dy > DISMISS_PX || (d.dy > 30 && speed > DISMISS_SPEED)) close();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={label}>
      <div
        className="absolute inset-0 bg-ink/30 [animation:fade-in_150ms_ease-out]"
        style={{ opacity: 1 - Math.min(dy / 400, 0.6) }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)",
          touchAction: dy ? "none" : "pan-y",
        }}
        className="relative max-h-[88dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[24px] bg-card px-5 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] [animation:sheet-up_220ms_cubic-bezier(.2,.8,.2,1)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-4 flex size-9 items-center justify-center rounded-full bg-divider text-ink-2"
        >
          <Close size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
