import Link from "next/link";
import type { Stage } from "@/lib/types";
import { Back } from "./icons";

const STAGES: { key: Stage; label: string }[] = [
  { key: "idea", label: "Idea" },
  { key: "planning", label: "Planning" },
  { key: "live", label: "Live" },
  { key: "memory", label: "Memory" },
];

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-card"
    >
      <Back size={18} />
    </Link>
  );
}

export function StageIndicator({ stage }: { stage: Stage }) {
  const at = STAGES.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-2">
      {STAGES.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          {i > 0 && <span className="h-px w-3.5 bg-faint" />}
          <span
            className={`size-1.5 rounded-full ${
              i < at ? "bg-ink" : i === at ? "bg-accent" : "border border-[#A9A59C]"
            }`}
          />
          {i === at ? <b className="font-semibold text-ink">{s.label}</b> : s.label}
        </span>
      ))}
    </div>
  );
}
