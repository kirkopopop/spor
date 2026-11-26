// Kept out of lib/theme.ts ("use client") so the server layout imports the string itself.

export const THEME_KEY = "spor-theme";

/**
 * Runs inline in <head> before the first paint (app/layout.tsx): resolves the saved preference
 * against the system setting, sets data-theme on <html>, and follows the system while on System.
 * A constant: nothing user-supplied is ever interpolated into it.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function p(){try{return localStorage.getItem("${THEME_KEY}")||"system"}catch(e){return "system"}}function a(){var v=p();d.dataset.theme=v==="dark"||(v==="system"&&m.matches)?"dark":"light"}a();m.addEventListener("change",a);window.__turTheme=a})()`;
