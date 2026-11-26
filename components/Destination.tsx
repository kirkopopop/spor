import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import { destinationOf, type Destination, type Landmark, type Photo } from "@/lib/destination";
import type { Trip } from "@/lib/types";
import edinburgh from "@/assets/photos/edinburgh.jpg";
import london from "@/assets/photos/london.jpg";
import munich from "@/assets/photos/munich.jpg";

/** Destination photos (assets/photos/CREDITS.md), each with the crop that keeps its subject. */
export const PHOTOS: Record<Photo, { src: StaticImageData; position: string; credit: string }> = {
  london: { src: london, position: "50% 55%", credit: "Lachlan Gowen" },
  munich: { src: munich, position: "38% 48%", credit: "Daniel Seßler" },
  edinburgh: { src: edinburgh, position: "62% 40%", credit: "Daniel J. Schwarz" },
};

// Drawn in the same grammar as components/icons.tsx: 24px grid, 1.7 stroke, round caps, no fills.
const GLYPHS: Record<Landmark, React.ReactNode> = {
  // Elizabeth Tower
  london: (
    <>
      <path d="M12 2l1.6 3.5h-3.2z" />
      <path d="M9.6 5.5h4.8v5H9.6z" />
      <circle cx="12" cy="8" r="1.3" />
      <path d="M10.2 10.5V22M13.8 10.5V22M10.2 14.5h3.6M10.2 18.5h3.6M7.5 22h9" />
    </>
  ),
  // Thistle: the banded head, its crown, the stem and leaves
  scotland: (
    <>
      <path d="M8.5 10h7c0 2.6-1.5 4.5-3.5 4.5S8.5 12.6 8.5 10z" />
      <path d="M9.6 12.3h4.8" />
      <path d="M9 10L7.4 6.2M10.7 10l-.6-4.6M12 10V5M13.3 10l.6-4.6M15 10l1.6-3.8" />
      <path d="M12 14.5V22M12 19c-2.4 0-4-1.1-4.7-3M12 17.8c2.4 0 4-1.1 4.7-3" />
    </>
  ),
  // Frauenkirche: two towers with their domes
  munich: (
    <>
      <path d="M5 22V9.5h3.8V22M15.2 22V9.5H19V22" />
      <path d="M5 9.5c0-2.4 1.9-3 1.9-5.3 0 2.3 1.9 2.9 1.9 5.3M15.2 9.5c0-2.4 1.9-3 1.9-5.3 0 2.3 1.9 2.9 1.9 5.3" />
      <path d="M8.8 13.5h6.4M3 22h18M6.9 13v1.6M17.1 13v1.6" />
    </>
  ),
  // Fernsehturm
  berlin: (
    <>
      <path d="M12 2v5.2M11 5h2" />
      <circle cx="12" cy="9.6" r="2.4" />
      <path d="M12 12v8M8.5 22l3.5-2 3.5 2" />
    </>
  ),
  // Eiffel Tower
  paris: (
    <>
      <path d="M12 2v3M10.6 5h2.8M10.6 5L7 22M13.4 5L17 22M9.3 11.5h5.4M7.9 17h8.2" />
      <path d="M9.6 22a2.4 2.4 0 0 1 4.8 0" />
    </>
  ),
  // Colosseum
  rome: (
    <>
      <path d="M3 9c2.2-1.6 15.8-1.6 18 0v11c-2.2 1.6-15.8 1.6-18 0z" />
      <path d="M3 14c2.2 1.3 15.8 1.3 18 0" />
      <path d="M6 20v-2.4a1.1 1.1 0 0 1 2.2 0v2.6M10.9 20.6v-2.8a1.1 1.1 0 0 1 2.2 0v2.8M15.8 20.2v-2.6a1.1 1.1 0 0 1 2.2 0V20" />
      <path d="M6.6 11.7v-.9M11.9 12.2v-.9M17.3 11.7v-.9" />
    </>
  ),
  // Canal houses: pointed, stepped and bell gables
  amsterdam: (
    <>
      <path d="M3.5 22V11l2.75-3L9 11v11" />
      <path d="M9 22V8h1.1V6.4h3.8V8H15v14" />
      <path d="M15 22V11c0-1.7 1.3-3 3-3s3 1.3 3 3v11" />
      <path d="M2 22h20M5.8 14h.9M11.6 11.5h.8M11.6 15.5h.8M17.6 14h.8" />
    </>
  ),
  // Nyhavn: a row of gabled harbour houses over the water
  copenhagen: (
    <>
      <path d="M3 17V9l3-3 3 3v8M9 17V7.5h6V17M15 17V9l3-3 3 3v8M2 17h20" />
      <path d="M5.4 11.5h1.2M11.4 10.5h1.2M11.4 13.5h1.2M17.4 11.5h1.2" />
      <path d="M2 20.5c1.7 1.2 3.3 1.2 5 0s3.3-1.2 5 0 3.3 1.2 5 0 3.3-1.2 5 0" />
    </>
  ),
  // Sagrada Família spires
  barcelona: (
    <>
      <path d="M4.5 22V11.5L6 5.5l1.5 6V22M9 22V9.5l1.5-7 1.5 7V22M12 22V9.5l1.5-7 1.5 7V22M16.5 22V11.5l1.5-6 1.5 6V22" />
      <path d="M3 22h18" />
    </>
  ),
  // Empire State among its neighbours
  newyork: (
    <>
      <path d="M10.4 22V9h3.2v13M11.2 9V6.3h1.6V9M12 6.3V2.5" />
      <path d="M4 22v-8.5h4V22M16 22V11h4v11M2 22h20" />
    </>
  ),
  // Torii
  tokyo: (
    <>
      <path d="M3 5.8c3 .9 15 .9 18 0M4.6 9h14.8M7 6.6V22M17 6.6V22M12 6.9V9" />
    </>
  ),
  mountains: (
    <>
      <path d="M2 20l6.5-10.5 4.2 6.3 2.6-3.6L22 20z" />
      <path d="M6.2 13.4l2.3 1.4 1.7-1.2" />
      <circle cx="17.5" cy="5.5" r="1.8" />
    </>
  ),
  coast: (
    <>
      <circle cx="16" cy="7.5" r="3" />
      <path d="M2 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M2 19.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" />
    </>
  ),
  // Suitcase, for anywhere not on the list yet
  trip: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M9 8V6.2C9 5.5 9.5 5 10.2 5h3.6c.7 0 1.2.5 1.2 1.2V8M8.5 8v12M15.5 8v12" />
    </>
  ),
};

export function LandmarkIcon({ landmark, size = 22, className }: { landmark: Landmark; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {GLYPHS[landmark]}
    </svg>
  );
}

/**
 * A trip's mark: its landmark on a tile tinted for the place. The tint is mixed with the theme's
 * card and ink, so one hue reads in light and dark; past trips fade toward the ground.
 */
export function DestinationMark({ destination, size = 44, past }: { destination: Destination; size?: number; past?: boolean }) {
  const style = { "--dest": destination.hue, width: size, height: size } as CSSProperties;
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-[12px] ${
        past
          ? "bg-soft text-muted"
          : "bg-[color-mix(in_srgb,var(--dest)_13%,var(--color-card))] text-[color-mix(in_srgb,var(--dest)_82%,var(--color-ink))]"
      }`}
    >
      <LandmarkIcon landmark={destination.key} size={Math.round(size * 0.55)} />
    </span>
  );
}

/** A destination photo, cropped to keep its subject, with the blur-up Next.js makes at build time. */
export function DestinationPhoto({ photo, sizes, eager, className = "" }: { photo: Photo; sizes: string; eager?: boolean; className?: string }) {
  const p = PHOTOS[photo];
  return (
    <Image
      src={p.src}
      alt=""
      fill
      sizes={sizes}
      placeholder="blur"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      style={{ objectFit: "cover", objectPosition: p.position }}
      className={className}
    />
  );
}

/** A trip's tile in lists: its place's photo with the landmark as a corner badge, or the mark alone. */
export function TripTile({ trip }: { trip: Trip }) {
  const dest = destinationOf(trip);
  if (!dest.photo) return <DestinationMark destination={dest} size={48} />;
  return (
    <span className="relative size-12 shrink-0">
      <span className="absolute inset-0 overflow-hidden rounded-[12px] bg-map">
        <DestinationPhoto photo={dest.photo} sizes="48px" />
      </span>
      <span className="absolute -right-1.5 -bottom-1.5 rounded-[9px] ring-2 ring-card">
        <DestinationMark destination={dest} size={22} />
      </span>
    </span>
  );
}
