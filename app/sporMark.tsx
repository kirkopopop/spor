// The home-screen mark: a route line with two stops on the paper background.
export function SporMark({ size }: { size: number }) {
  const s = size / 100;
  return (
    <div style={{ width: size, height: size, background: "#F6F5F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={70 * s} height={70 * s} viewBox="0 0 70 70">
        <path d="M14 56 C 14 34, 56 40, 56 14" fill="none" stroke="#E2553A" strokeWidth="7" strokeLinecap="round" />
        <circle cx="14" cy="56" r="8" fill="#16181D" />
        <circle cx="56" cy="14" r="8" fill="#F6F5F2" stroke="#E2553A" strokeWidth="5" />
      </svg>
    </div>
  );
}
