"use client";

import { useCallback, useSyncExternalStore } from "react";

// Screen state kept in the address bar without a server round trip:
// `push` adds a history entry (Back undoes it), `replace` does not.
const EVENT = "spor:url";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useUrlParam(key: string, mode: "push" | "replace" = "push") {
  const value = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(key),
    () => null,
  );

  const setValue = useCallback(
    (next: string | null) => {
      const url = new URL(window.location.href);
      if (next == null) url.searchParams.delete(key);
      else url.searchParams.set(key, next);
      if (url.href === window.location.href) return;
      if (mode === "push") window.history.pushState(window.history.state, "", url);
      else window.history.replaceState(window.history.state, "", url);
      window.dispatchEvent(new Event(EVENT));
    },
    [key, mode],
  );

  return [value, setValue] as const;
}
