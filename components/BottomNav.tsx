import Link from "next/link";
import { Kit, MapIcon, Pin, Trips } from "./icons";

const ITEMS = [
  { key: "trips", href: "/", label: "Trips", Icon: Trips },
  { key: "map", href: "/map", label: "Map", Icon: MapIcon },
  { key: "places", href: "/places", label: "Places", Icon: Pin },
  { key: "kit", href: "/kit", label: "Kit", Icon: Kit },
] as const;

export function BottomNav({ active }: { active: (typeof ITEMS)[number]["key"] }) {
  return (
    <nav className="sticky bottom-0 flex justify-around border-t border-line bg-bg px-3 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))] text-[11px]">
      {ITEMS.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          className={`flex flex-col items-center gap-1 rounded-xl px-3.5 py-1.5 ${
            key === active ? "bg-soft font-semibold" : "text-muted"
          }`}
        >
          <Icon size={22} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
