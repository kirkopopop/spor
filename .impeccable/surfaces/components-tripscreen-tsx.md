---
version: 1
slug: "components-tripscreen-tsx"
primary_target: "components/TripScreen.tsx"
related_targets: ["components/HomeScreen.tsx","app/settings/page.tsx","app/trips/page.tsx"]
---

## Scope

The whole tur app shell and its main surfaces: Overview, Trips, a trip (map + sheet, with Plan / Bookings / Money / Notes, and Today during a trip), Settings. Mode: Operate. Phone-first PWA; also works at desktop width.

## Audience and job

A household that travels together. Between trips: browse all trips and prepare the next. During a trip: now/next, leave-by, tick, expenses, notes, one-handed, outdoors.

## Direction contract

THESIS: The category standard played straight: a real map on top with the plan in a sheet over it, the way Apple Maps does places and Airbnb does trips. It refuses the single long page of stacked cards the app had, and refuses an invented visual world.

OWN-WORLD: Light grouped ground (#F5F6F8), white sheets and grouped lists, ink #0F1720, one blue accent (#2563EB) for the route, selection and primary actions; fixed times in a burnt orange; booked in green. System UI stack (SF on Apple devices, Inter elsewhere). OpenFreeMap "positron" vector map, numbered pins that match numbered timeline rows. Soft shadows with real offset on floating controls and sheets only.

STORY: The visitor sees where they are going before reading anything, understands each day as numbered stops on the map and in the list, taps a stop to get how and what-if, and runs the day from the same screen. Settings manage the household, the Claude connector and preferences.

FIRST VIEWPORT: Trip: full-bleed map with the day's numbered route; floating back and "Ask Claude" controls top; a sheet from the bottom (~45% height, draggable to full) with the trip title, dates and people, a segmented control (Plan / Bookings / Money / Notes; Today first during a trip), day pills, then the numbered timeline. Overview: large title, a map card of every trip's route, the next trip with its countdown as the one big number, then Upcoming, Ideas and Past rows. Tab bar: Overview, Trips, Settings.

FORM: category standard (the canon card), chosen by the user from the direction round; benchmarks Apple Maps / Weather, Airbnb, Oura. seed:d2a28886cbf89af2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Cited adaptations (after the finish review)

- "Ask Claude" is a chip on each day (beside "If it rains") instead of a floating control: the link prefills that day's context, which a screen-level control can't know. Overview carries "Plan with Claude" for the next trip.
- The sheet opens at ~56% of the screen, not ~45%: PRODUCT.md puts the plan high on the first screen and the user named "plan hidden" as what would feel wrong; the map still owns the top.
- At ≥900px the sheet becomes the left half with the back control in its header, the map the right half; a tapped stop docks as a card against the plan, at the seam with the map (the user asked for this split and placement).
- Stop order is drawn as quiet dashed connectors (not real paths); only the leg into the open or next stop is solid. Overlapping pins merge into one marker naming their stops ("2–7").
- Trips with no stops yet have no coordinates, so they can't appear on the Overview map until Claude adds stops.

## Memorable moment

Tapping a numbered row and the map flying to its pin while the sheet turns into that stop's place card.

## Unresolved

Dark mode; Memory stage; Places and Kit.
