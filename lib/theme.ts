"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./themeScript";

export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";

/** This device's saved choice (what the first paint used). */
export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Saves the preference on this device and applies it now. */
export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Private mode: still apply for this visit.
  }
  const apply = (window as unknown as { __turTheme?: () => void }).__turTheme;
  if (apply) apply();
  else document.documentElement.dataset.theme = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}

/** The theme in effect right now, following changes to <html data-theme>. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => obs.disconnect();
    },
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/** A colour token's current value, for code that can't use CSS (the map). */
export function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}
