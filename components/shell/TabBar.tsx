"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OverviewIcon, SettingsIcon, TripsIcon } from "../icons";

const TABS = [
  { href: "/", label: "Overview", Icon: OverviewIcon },
  { href: "/trips", label: "Trips", Icon: TripsIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

/** The app's three places. Hidden inside a trip, where the map and sheet take the screen. */
export function TabBar({ split }: { split?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav
      aria-label="Main"
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-card/90 backdrop-blur-xl backdrop-saturate-150 ${split ? "min-[1024px]:left-2/3" : ""}`}
    >
      <div className="mx-auto flex max-w-[640px] justify-around px-2 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))]">
        {TABS.map(({ href, label, Icon }) => {
          const on = active(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`press flex min-w-20 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium ${
                on ? "text-accent" : "text-muted"
              }`}
            >
              <Icon size={25} strokeWidth={on ? 2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * A tab's page: large title, optional trailing action, content, room for the tab bar.
 * `aside` is a panel that leads the page on a phone and, from 1024px, takes the left two thirds
 * of the screen, fixed, while the title and content scroll in the right third.
 */
export function Screen({ title, action, aside, children }: { title: string; action?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  const split = !!aside;
  return (
    <div className={`mx-auto flex min-h-dvh max-w-[640px] flex-col ${split ? "min-[1024px]:mr-0 min-[1024px]:ml-[66.667%] min-[1024px]:max-w-none" : ""}`}>
      <header className="flex items-end justify-between gap-3 px-5 pt-[max(56px,calc(env(safe-area-inset-top)+20px))] pb-3">
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {action}
      </header>
      {aside && (
        <div className="px-4 pb-7 min-[1024px]:fixed min-[1024px]:inset-y-4 min-[1024px]:left-4 min-[1024px]:w-[calc(66.667%-24px)] min-[1024px]:p-0">{aside}</div>
      )}
      <main className="flex flex-1 flex-col gap-7 px-4 pb-32 [animation:rise_320ms_cubic-bezier(.2,.8,.2,1)]">{children}</main>
      <TabBar split={split} />
    </div>
  );
}

/** iOS-style inset grouped list. */
export function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-1.5 px-4 text-[13px] font-medium text-muted uppercase tracking-[0.02em]">{title}</h2>}
      <div className="divide-y divide-divider overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">{children}</div>
      {footer && <div className="mt-1.5 px-4 text-[13px] leading-snug text-muted">{footer}</div>}
    </section>
  );
}

export function Row({
  children,
  href,
  onClick,
  trailing,
  chevron,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  chevron?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing && <div className="shrink-0 text-[15px] text-muted">{trailing}</div>}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true" className="shrink-0 text-faint">
          <path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const cls = `flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left ${className}`;
  if (href) return <Link href={href} className={`press ${cls}`}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`press ${cls}`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
