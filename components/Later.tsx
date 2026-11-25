import { BottomNav } from "./BottomNav";

// Map, Places and Kit come after Munich (design doc § Cut until after Munich).
export function Later({ title, active }: { title: string; active: "map" | "places" | "kit" }) {
  return (
    <>
      <header className="px-5 pt-14 pb-3">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">{title}</h1>
      </header>
      <main className="flex-1 px-5 text-sm text-muted">Not yet.</main>
      <BottomNav active={active} />
    </>
  );
}
