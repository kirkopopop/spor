// The home-screen mark: a route with two stops, the blue of the app's routes.
export function TurMark({ size }: { size: number }) {
  const s = size / 100;
  return (
    <div style={{ width: size, height: size, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={66 * s} height={66 * s} viewBox="0 0 70 70">
        <path d="M14 56 C 14 34, 56 40, 56 14" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
        <circle cx="14" cy="56" r="8.5" fill="#FFFFFF" />
        <circle cx="56" cy="14" r="8" fill="#2563EB" stroke="#FFFFFF" strokeWidth="5" />
      </svg>
    </div>
  );
}
