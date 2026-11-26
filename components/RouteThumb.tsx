import { projectRoutes } from "@/lib/routeMap";
import type { Trip } from "@/lib/types";

/** A trip's route as a small tile: cheap enough for every row, readable at 44px. */
export function RouteThumb({ trip, size }: { trip: Trip; size: number }) {
  const { routes } = projectRoutes([trip], 100, 100, 18);
  const pts = routes[0]?.points ?? [];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0 rounded-[12px] bg-map">
      {pts.length > 1 && (
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          className="stroke-accent"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.length > 0 ? (
        <>
          <circle cx={pts[0][0]} cy={pts[0][1]} r={7} className="fill-card stroke-accent" strokeWidth={4} />
          <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={7} className="fill-accent" />
        </>
      ) : (
        <circle cx={50} cy={50} r={8} fill="none" className="stroke-faint" strokeWidth={4} />
      )}
    </svg>
  );
}
