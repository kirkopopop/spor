// tur's mark: a white suitcase on the app's blue.

/** The suitcase alone. `accent` paints the straps (the tile colour, so they read as cut-outs; "currentColor" works in the app). */
export function Suitcase({ size, accent }: { size: number; accent: string }) {
  return (
    <svg width={size} height={size} viewBox="14 18 72 72" aria-hidden="true">
      <path d="M40 36 V29 Q40 25 44 25 H56 Q60 25 60 29 V36" fill="none" stroke="#FFFFFF" strokeWidth="5" />
      <rect x="25" y="36" width="50" height="40" rx="8" fill="#FFFFFF" />
      <line x1="38" y1="42" x2="38" y2="70" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <line x1="62" y1="42" x2="62" y2="70" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <circle cx="35" cy="81" r="3.5" fill="#FFFFFF" />
      <circle cx="65" cy="81" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

/** The home-screen icon: full-bleed blue square (the OS rounds the corners). */
export function TurMark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Suitcase size={size * 0.8} accent="#2563EB" />
    </div>
  );
}
