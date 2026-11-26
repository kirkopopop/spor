// MapLibre draws the map in a web worker that bundlers don't emit. Copy it into public/
// before dev and build, so /maplibre-worker.mjs always matches the installed version.
import { copyFileSync } from "node:fs";

copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-worker.mjs");
