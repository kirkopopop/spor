// Stroke icons from the mockup. No emoji anywhere (handover § Design tokens).
import type { SVGProps } from "react";
import type { TravelMode } from "@/lib/types";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Back = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const Chevron = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const Trips = (p: P) => (
  <Svg {...p}>
    <path d="M3 7h18M3 12h18M3 17h12" />
  </Svg>
);
export const MapIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
  </Svg>
);
export const Pin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);
export const Kit = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="1.6" fill="var(--color-bg)" />
    <circle cx="15" cy="12" r="1.6" fill="var(--color-bg)" />
    <circle cx="8" cy="17" r="1.6" fill="var(--color-bg)" />
  </Svg>
);
export const Directions = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M3 11l18-8-8 18-2-8-8-2z" />
  </Svg>
);
export const Close = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const Check = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

const MODE_PATHS: Record<TravelMode, React.ReactNode> = {
  walk: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 8v6l-3 7M12 14l3 7M8 11h8" />
    </>
  ),
  tube: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M8 21l2-4M16 21l-2-4M5 11h14" />
    </>
  ),
  train: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M8 21l2-4M16 21l-2-4M5 11h14" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M7 20v-3M17 20v-3" />
    </>
  ),
  taxi: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5H5z" />
      <path d="M5 11h14M7 19v-3M17 19v-3" />
    </>
  ),
  car: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5H5z" />
      <path d="M5 11h14M7 19v-3M17 19v-3" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l4-8h5l3 8M10 8l2 8" />
    </>
  ),
  plane: <path d="M3 13l8-2 4-7 2 1-2 6 5 1 1 2-6 1-3 6-2-1 1-5-7-1z" />,
};

export const Mode = ({ mode, ...p }: P & { mode: TravelMode }) => (
  <Svg strokeWidth={1.8} {...p}>
    {MODE_PATHS[mode] ?? MODE_PATHS.walk}
  </Svg>
);
