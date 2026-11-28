---
name: tur
description: Trips, planned and lived. The category standard for travel apps, played straight: a real map on top, the plan in a sheet over it.
colors:
  bg: "#f5f6f8"
  card: "#ffffff"
  ink: "#0f1720"
  ink-2: "#3e4a57"
  muted: "#66717e"
  faint: "#a3acb7"
  line: "#e3e6ea"
  divider: "#eef0f3"
  soft: "#eceff3"
  accent: "#2563eb"
  accent-ink: "#1d4fd7"
  accent-soft: "#e8f0fe"
  fixed: "#c2410c"
  fixed-soft: "#fdf0e8"
  ok: "#12805c"
  ok-soft: "#e6f4ee"
  danger: "#c62828"
  map: "#e9edf1"
  route-past: "#8a97a6"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\""
  headline-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.375
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
  body-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\""
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  focus: "8px"
  segment: "10px"
  field: "12px"
  control: "14px"
  card: "16px"
  panel: "20px"
  sheet: "22px"
  modal: "24px"
  full: "999px"
spacing:
  cluster: "8px"
  stack: "12px"
  gutter-screen: "16px"
  gutter-sheet: "20px"
  section: "28px"
  row-min: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: "48px"
    width: "100%"
  button-pill-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-action:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "60px"
  button-action-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
    height: "60px"
  button-round-float:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "40px"
  chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-fixed:
    backgroundColor: "{colors.fixed-soft}"
    textColor: "{colors.fixed}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  segmented:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.field}"
    padding: "2px"
  segmented-selected:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.segment}"
    padding: "6px 0"
  day-pill:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "8px 14px"
  day-pill-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "8px 14px"
  stop-number:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    size: "28px"
  stop-number-fixed:
    backgroundColor: "{colors.fixed-soft}"
    textColor: "{colors.fixed}"
    rounded: "{rounded.full}"
    size: "28px"
  stop-number-done:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    size: "28px"
  pin:
    backgroundColor: "{colors.card}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: "26px"
  pin-fixed:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fixed}"
    rounded: "{rounded.full}"
    size: "26px"
  pin-done:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    size: "26px"
  pin-next:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    size: "26px"
  pin-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    size: "34px"
  pin-group:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "26px"
  group:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
  row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 16px"
    height: "48px"
  tab-bar-item:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.field}"
    padding: "6px 12px"
  tab-bar-item-active:
    textColor: "{colors.accent}"
  bottom-sheet:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sheet}"
    padding: "8px 20px 0"
  modal-sheet:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.modal}"
    padding: "12px 20px 28px"
---

# Design System: tur

## Overview

**Creative North Star: "The Category Standard, Played Straight"**

tur looks like the travel app you already know how to use, built with the care of the best of them. A real vector map owns the top of a trip; the plan sits in a white sheet over it that drags between three heights, the way Apple Maps does places and Airbnb does trips. Between trips the app is a calm iOS-style grouped list on a light grey ground, with one big number (the countdown) the way Oura shows a score. Nothing is invented for its own sake: familiar conventions, executed at full fidelity.

The system is quiet so the plan can be read in the street, one-handed, in sun. One blue carries the route, the selection and the primary action. Burnt orange marks fixed times and things still to book; green marks what is done or booked. Status is carried by these tones and by fill, not by words. Type is the device's own UI face, set with tight negative tracking on titles and tabular figures on every time and number, so columns of times line up.

Density is calm, not sparse: one line per stop with its time beneath, detail behind a tap. The map and the list share one numbering: stop 3 in the timeline is pin 3 on the map. The user's confirmed rejection is an invented visual world; the app has none.

**Key Characteristics:**
- A full-bleed map on top, the plan in a draggable sheet (peek 30%, half 56%, full 92%); the plan as the left half at 900px and wider, map the right half; an open stop docks as a 380px card against the plan at the seam with the map, as tall as its content; at panel widths of 560px+ stop rows read as an itinerary (time, number, stop, travel in its own column).
- Light grouped ground (#f5f6f8), white sheets and grouped lists, ink text, one blue accent.
- Numbered stops that match numbered pins; real walking paths along the streets, dashed connectors where only the order is known, one solid leg for the way you are going.
- A night palette for evenings (System / Light / Dark), the same world with fills brightened and text on them turned dark.
- System UI type (SF on Apple devices, Inter elsewhere), negative tracking on titles, tabular figures on times.
- Soft, offset shadows only on things that float over the map: the sheet, round map controls, pins.
- Quiet press feedback (scale 0.98) on every tappable row and button; native-feeling sheet physics.

## Colors

A cool, near-neutral grey family on white, with one saturated blue and two status tones that each mean exactly one thing.

### Primary
- **Route Blue** (accent): the route line, the next and selected pin, the active tab, the selected expense category, links ("Add stop", "Day", "Sign out"), "Pick one", the caret and the focus ring, and every primary action ("Directions", "Plan with Claude", Save).
- **Deep Route Blue** (accent-ink): numbers and text on the pale blue fill of an ordinary stop number and on accent-soft chips, where Route Blue itself would be too light.
- **Blue Wash** (accent-soft): the fill behind an ordinary stop number, the current stop's row in Today, invite chips, and the text selection.

### Secondary
- **Fixed-Time Orange** (fixed): fixed times, "leave by" lines, "To book", the Bookings tab count, fixed pins and fixed stop numbers. It says "this time is not yours to move".
- **Orange Wash** (fixed-soft): the fill behind a fixed stop number and the "To book" chip.

### Tertiary
- **Ticked Green** (ok): a done stop (filled number with a check, green pin), "Booked", "All booked", "Synced", "Connected".
- **Green Wash** (ok-soft): the fill behind "Booked" and "All booked" chips.

### Neutral
- **Night Ink** (ink): primary text, the selected day pill, merged pin groups, the avatar disc, and the modal scrim (at 30%).
- **Slate** (ink-2): secondary text that must still read well: dates under a trip, travel notes, chip text.
- **Muted Slate** (muted): meta lines, section headers, unselected tab-bar items, field labels and quiet empty states (4.9:1 on white).
- **Faint Slate** (faint): chevrons, empty tick rings, the dashed outline of an optional stop, scrollbars. Never for text that has to be read.
- **Hairline** (line): field borders, option-list borders, the sheet grabber, the Live card divider.
- **Divider** (divider): rule lines between rows inside a group, the travel connector between stops, the modal close button's disc.
- **Soft Fill** (soft): unselected day pills, segmented-control tracks, secondary action buttons, neutral chips.
- **Grouped Ground** (bg): the page background behind grouped lists, and inset panels inside a sheet (travel detail, "more", the Live next card, "Spent today").
- **Sheet White** (card): sheets, grouped lists, cards, fields, unfilled pins and their 2px rings, the selected segment.
- **Positron Ground** (map): the plain ground shown before tiles arrive or when offline, so pins and routes still draw on something calm.
- **Past Route Grey** (route-past): whole-trip lines on the Overview map for trips already taken.
- **Danger Red** (danger): destructive actions (Delete, Remove, Revoke, Delete account) and form errors only.

### Named Rules

**The One Blue Rule.** Route Blue means "the way, the choice, the action": route, next or selected stop, active tab, primary button. It is never decoration and never a group marker.

**The Status-by-Tone Rule.** Orange is fixed or still to book; green is done or booked. A status shows as tone and fill on the existing element (number, time, chip, pin); the only status words on screen are "To book" and "Pick one".

**The Ink Group Rule.** A merged pin group is ink, so a cluster can never be mistaken for the next or selected (blue) stop.

## Typography

**Display Font:** -apple-system / SF Pro Text (with Inter, loaded at 400/500/600/700, then system-ui)
**Body Font:** the same stack
**Label/Mono Font:** the same stack; tabular figures (`tnum`) stand in for a mono face wherever times and amounts align

**Character:** The device's own voice. SF on an iPhone makes tur feel native; Inter elsewhere keeps the same proportions. Titles are bold with tight negative tracking; everything else is regular or medium, and contextual alternates (`cv11`, `ss01`) are on globally.

### Hierarchy
- **Display** (600, 52px, line-height 1, -0.03em, tabular): the one big number: the countdown to the next trip on Overview.
- **Headline Large** (700, 34px, 1.25, -0.025em): a tab's large title ("Overview", "Trips", "Settings"). The Live next time uses the same size at 600 weight and line-height 1, tabular.
- **Headline** (700, 24px, 1.25, -0.02em): the trip name in the sheet header and a stop's name in its place card. Balanced wrap, up to two lines.
- **Title** (700, 22px, 1.25, -0.02em): the next trip's name on Overview and every modal sheet's title ("New trip", "Note", "Invite someone").
- **Title Small** (700, 20px, 1.375, -0.02em): the day heading in the plan; "No trip coming up".
- **Body** (400, 16px, 1.375): stop names, row text, fields, option names. Never smaller in an input (prevents zoom on iOS).
- **Body Small** (400–600, 15px, 1.5): secondary buttons and links, trip dates, travel detail, quiet empty states ("None yet.").
- **Meta** (400, 14px, tabular): the time line under each stop, row subtitles, Live list times.
- **Label** (500, 13px, 0.02em, uppercase for group headers): grouped-list section headers ("Upcoming", "Notes", "Pick one"), segmented-control labels, chips, the travel line between stops.
- **Caption** (500, 11–12px): tab-bar labels (11px) and the labels under action buttons (12px).

### Named Rules

**The Tabular Time Rule.** Every time, duration, count and amount is set with tabular figures, so times stack cleanly down the timeline.

**The One Big Number Rule.** A screen has at most one display-sized number: the countdown on Overview, or the next time in Today. Everything else stays at body scale.

## Layout

Phone-first, single column. Tab screens (Overview, Trips, Settings) center in a 640px column with a 16px side gutter, a large title header that clears the safe area (at least 56px from the top), 28px between sections, and 128px of bottom room for the fixed, translucent tab bar.

A trip is a different layout: the map fills the viewport, a round back control floats top-left over it, and the plan is a bottom sheet with a 20px inner gutter. The sheet snaps to peek (30% of the viewport), half (56%, the default, so the plan sits high while the map still owns the top) and full (92%); a drag can range from 18% to 95%, and a flick faster than 0.5px/ms moves one snap. The map's camera padding follows the sheet's live height, so pins are never fitted under it. At 900px and wider the sheet becomes the left half of the screen, inset 16px from the top, bottom and left edges, the back control moves into its header, and the map fills the right half. A tapped stop opens as a 380px card docked 12px from the plan, at the seam with the map, only as tall as its content; the day list stays put with that row tinted, and the map keeps the pin clear of the card. When the panel is 560px or wider (a container query, not the viewport), each stop row reads as an itinerary: time first, then number and name, with how you get there in its own right-hand column instead of a line between rows.

Inside the sheet: header (title, dates and people, segmented tabs), then a sticky row of day pills, then the day's heading, chips ("If it rains", "Ask Claude"), and the numbered timeline. Modal sheets are a separate layer: 440px max width, at most 88% of the viewport tall.

Rhythm: 8px between chips and pills, 12px between form fields, 48px minimum row and button height, 44px minimum hit area for ticks, 60px for the stop action buttons.

### Named Rules

**The Map Owns the Top Rule.** On a trip, the map is always the top of the screen and the plan is always a sheet over it; content never pushes the map off-screen. With no stop on the map it looks at the destination; with no destination either, the sheet opens full and the map stays a strip.

**The Number Match Rule.** A stop's number in the list and its pin on the map are the same number and the same tone. Tapping either opens that stop.

## Elevation & Depth

A hybrid: tonal layering for everything that belongs to the page, real offset shadows only for things that float over the map. Grouped lists and cards sit on the grey ground with a single hairline shadow; inset panels inside a sheet step back to the ground colour instead of rising. The tab bar floats by translucency (white at 90% with a strong backdrop blur), not by shadow.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 2px 8px rgb(15 23 32 / 0.12), 0 1px 2px rgb(15 23 32 / 0.08)`): round controls over the map, the desktop side panel, the Live directions button, the Overview stats pill, the new-trip button.
- **Sheet** (`box-shadow: 0 -6px 24px rgb(15 23 32 / 0.10), 0 -1px 2px rgb(15 23 32 / 0.06)`): the bottom sheet, cast upward onto the map.
- **Card** (`box-shadow: 0 1px 2px rgb(15 23 32 / 0.06)`): grouped lists, Overview cards, the selected segment.
- **Pin** (`box-shadow: 0 2px 6px rgba(15,23,32,.25)`): map pins, so a white pin separates from pale tiles.

### Named Rules

**The Float-Only Shadow Rule.** Only what floats over the map casts a real shadow. Content inside a sheet never gets one; it uses the ground colour to recede.

## Shapes

Soft, continuous curves throughout, scaled to the element: full pills for chips, pins, stop numbers and round controls; 22px for the bottom sheet and the Overview cards and map; 24px for the top of a modal sheet; 20px for the Live next card; 16px for grouped lists, action buttons, inset panels and day pills; 14px for the segmented-control track and text areas; 12px for fields and primary buttons; 10px for a selected segment; 8px for the focus ring. Borders are rare (fields, the option list) and always the 1px hairline. The sheet grabber is a 36 by 5px pill.

On the map, three line styles tell the truth about a leg: a routed walk is a 2.5px solid line along the streets at 55% opacity; a leg whose path isn't known (transit, or a walk after a train) is a 2px dashed line (dash 1.5, gap 2) at 50%; the active leg is a 3px solid line on a 6px casing in the card colour at 90%. Every pin has a 2px ring in the card colour. Routed walks also replace Claude's estimated minutes in the list, the place card and leave-by times (the `~` goes away).

## Components

### Buttons
Tactile and plain: filled, rounded, no outlines, a quiet 0.98 press.
- **Shape:** 12px radius for full-width form buttons; full pills for inline calls to action; 16px for the four-up action buttons; full circles for round controls.
- **Primary:** Route Blue fill, white 16px semibold text, 48px tall, full width (Save, Add, Create trip). The inline pill version is 15px semibold with a 17px icon, 8px by 16px ("Plan with Claude").
- **Action buttons:** a four-column grid of 60px tiles on a stop: icon over a 12px label. "Directions" is the one blue tile, shown only when the stop has a place; Earlier (−15), Later (+15) and Edit sit on Soft Fill.
- **Round controls:** 40px white circles with the Float shadow over the map (back); 36px blue circle with the Float shadow for "new trip"; 48px blue circle for directions in Today.
- **Text buttons:** 15px medium in Route Blue ("Add stop", "Day", "Show 2 earlier stops"); destructive ones in Danger Red.
- **Press / Focus:** every tappable element scales to 0.98 and drops to 88% opacity over 140ms (cubic-bezier(0.2, 0.8, 0.2, 1)). Focus is a 2px Route Blue outline at 2px offset with an 8px radius. Disabled is 40% opacity.

### Chips
- **Style:** full pills, 13px medium, 6px by 12px, no border. Neutral on Soft Fill with Slate text; "To book" on Orange Wash; "Booked" / "All booked" on Green Wash. Day chips ("If it rains", "Ask Claude") are 14px with a 16px icon.
- **State:** choice chips (expense category) fill Route Blue with white text when selected.

### Cards / Containers
- **Corner Style:** 16px for grouped lists, 22px for Overview cards.
- **Background:** Sheet White on Grouped Ground; inset panels inside a sheet use Grouped Ground.
- **Shadow Strategy:** Card shadow only (see Elevation & Depth).
- **Border:** none; rows inside a group are separated by Divider rules.
- **Internal Padding:** 16px for rows, 20px for Overview cards and sheet content.

### Inputs / Fields
- **Style:** 48px tall, white, 1px Hairline border, 12px radius, 16px text, 16px side padding. Text areas use 14px radius and 12px vertical padding. Labels are 13px Muted Slate above the field, or visually hidden when the placeholder says it.
- **Focus:** the border turns Route Blue; the caret is Route Blue.
- **Error / Disabled:** errors are a 14px Danger Red line below the fields; a disabled submit drops to 40% opacity.

### Segmented Control
A Soft Fill track with a 2px inset; the selected segment is white, semibold, with the Card shadow and a 10px radius; others are Slate. Used for the trip tabs (Plan / Bookings / Money / Notes, with Today first during a trip) and in forms (stop kind, paid by, time format).

### Navigation
- **Tab bar:** three places (Overview, Trips, Settings), fixed to the bottom, translucent white with a hairline top border and backdrop blur, clearing the home indicator. Items are a 25px icon over an 11px medium label; active is Route Blue with a 2px stroke, inactive Muted Slate with a 1.7px stroke. Hidden inside a trip.
- **Large title:** 34px bold title with an optional trailing round control (avatar disc on Overview, new-trip button on Trips).
- **Grouped list:** iOS inset groups: an uppercase 13px Muted Slate header above, rows of at least 48px with 16px padding, an optional trailing value in Muted Slate and an 8 by 14px Faint Slate chevron, an optional 13px footer.
- **Day pills:** a sticky, horizontally scrolling row of 16px-radius pills (14px semibold day, 12px place); the selected day is Night Ink with white text.

### Map Pins (signature)
White 26px circles with a 2px white ring and the Pin shadow, numbered in 12px semibold tabular figures. The number's colour is the status: Route Blue by default, Fixed-Time Orange for a fixed stop, Ticked Green for a done one. The next stop fills Route Blue with a white number; the selected stop fills blue and grows to 34px with a 14px number and sits above the others. Pins within 28px of each other merge into one Night Ink pill naming their stops ("2–7", or "2+" when not consecutive); tapping it zooms to fit them. The selected pin never merges.

### Stop Row and Place Card (signature)
A stop row is a 28px number disc (Blue Wash with Deep Route Blue by default, Orange Wash with orange for fixed, Ticked Green with a check when done, a dashed Faint Slate outline for optional), the name in 16px, and the time beneath in 14px tabular (semibold orange when fixed), with "To book" or "Pick one" inline. Between rows, a quiet 13px travel line on a 2px Divider connector; "leave by" appears only before a fixed stop. Tapping a row turns the sheet into the stop's place card (fade-in 180ms) and flies the map to its pin (700ms): a solid 32px number, the 24px name, status chips, the four action buttons, then travel, options and notes.

### Destination marks and photos (signature)
Every trip shows where it goes. `lib/destination.ts` reads the place from the trip's name, then its days' cities, and only last its timezone (a new trip takes the planner's own); fourteen landmarks cover it: Elizabeth Tower (London/UK), thistle (Scotland), Frauenkirche towers (Munich), Fernsehturm (Germany), Eiffel Tower (France), Colosseum (Italy), canal houses (Netherlands), Nyhavn houses (Denmark), Sagrada Família spires (Spain), Empire State (USA), torii (Japan), mountains, coast, and a suitcase for anywhere else. Landmarks are drawn in the icon grammar (24px grid, 1.7 stroke, round caps, no fills).

A mark is the landmark on a tile tinted for the place: the tile is the destination hue at 13% over the card colour, the glyph the hue at 82% toward ink, so one hue reads in light and dark. Destination hues live only in marks; they never colour text, buttons or the route (One Blue still holds).

Photos are real (Unsplash, credited in `assets/photos/CREDITS.md`), stored in the repo so they work offline and call no third party, statically imported for blur-up and responsive sizes, and cropped per photo to keep the subject. Where a destination has one: the next-trip card leads with it (name, dates and the countdown in white on a bottom scrim, the mark as a label chip top-left), a trip row shows it as its tile with the mark as a corner badge, and Memory opens on it. Where none exists, the mark stands in. Never a decorative photo with no place behind it.

### Globe (Overview)
The Overview opens on the household's world: a MapLibre globe (globe projection, a thin atmosphere that fades as you zoom in) on a soft sky gradient, deep space at night. On a phone it leads the page as a 360px card (440px from 640px wide). From 1024px the page splits: the globe is a fixed, full-height panel across the left two thirds (inset 16px, 22px radius), and the title, next trip and trip lists scroll in the right third with the tab bar under that column only (`Screen`'s `aside`). Every trip with a place gets a pin wearing its destination mark in a card-coloured frame, ringed by stage: blue while planning or live, green once it is a memory (the app's status tones). A trip sits at its destination's centre, else its first stop on the map. Past trips' routes are thin green lines, planned ones blue.

It turns slowly west to east (2.4° a second) until first touched, never under reduced motion, and pauses when the tab is hidden. Drag to turn; pinch, double-tap, the +/− buttons or (with a mouse or trackpad) the scroll wheel to zoom. On a phone a swipe still scrolls the page past it. An All / Planning / Live / Memory filter (the trip stages, with counts; a stage with no trip is left out) sits top-left on a blurred pill. Tapping a pin flies to it (zoom 3.4) and raises the trip's card at the bottom: its tile, name, and one line for its stage ("In 25 days · 21–25 Dec", "Live · 27–30 Nov", "19–22 Nov 2026 · Memory"); tapping the globe puts it down and pulls back to the whole globe. With nothing selected, the year's stats sit bottom-left. The map credit folds to its ⓘ under the zoom buttons.

### Places been (on the globe)
A fourth globe filter, **Been**, shows where each person has been: visited countries filled in the ok green under the place names (45% for one person), a dot per city, trip pins hidden. With several people it shows a Me / Tanya / Both switch; Both shades deeper (62%) where everyone shown has been and lighter (28%) where only some have, and the bottom pill counts "countries together". Ended trips count by themselves for the people on them (their country and each city stayed in); everything else is logged by hand.

Logging is one sheet ("+ Places", bottom-right in Been mode): one field finds countries (the browser's own country names, offline) and cities (Photon, as you type, only the text sent), each result with its region so namesakes are clear (real settlements only, cities and towns first, names without "Municipality" and the like); below, everything so far by country, with Remove on what you logged and "From a trip" on the rest. Tapping a city you logged renames it in place. On your own view, tapping a country on the globe adds it, or takes back one you logged by itself, with an Undo toast. Each city shows as a green dot or, by the "Cities on the globe" setting, its country's flag (flag-icons, MIT, pre-rendered to small PNGs in `public/flags` and loaded per country as needed). Outlines are Natural Earth 1:50m (public domain, `assets/geo`), close enough to follow real borders and including small countries, loaded the first time Been opens.

### Sign-in
The front door is a window onto a journey. Phone: a full-bleed portrait photo (London at dusk) with the wordmark top-left, "Trips, planned and lived." in 34px white over it, and the sign-in in a sheet that rises from the bottom (the photo-then-sheet logic of the trip screen). Laptop: the wide train-window photo as an inset 28px-radius panel on the left, the form in its own column on the right under a quiet row of landmarks. Art-directed with `<picture>`, so only one photo downloads. The photo settles once (scale 1.06 to 1 over 2.4s); reduced motion skips it.

### Memory (past trips)
A past trip opens on a Memory tab before Plan. One big number (places reached, Display 52px) with "of N planned" and how many days were told from the plan; the facts in one 15px line (days, cities, km on foot from routed walks, spend of planned); then Day by day rows (ticked / planned, or "N planned" for an unticked day), Didn't make it (only recorded days), and the notes as a Journal, oldest first. The map shows each day's line through the places reached with one green pin per day; tapping a pin or a day row opens that day's plan.

### Night palette
Set before first paint from the System / Light / Dark choice (Settings → Preferences → Appearance; saved on the device and on the account). Ground #0b0f14, sheets #161c24, ink #e9eef3, muted #8d99a6 (5:1 on soft), accent #5b9bff, fixed #ff8f57, ok #41d098, danger #ff6b6b; text on fills turns #0b0f14; the selected segment lifts to raised #343e4a. Every text pairing is at least 4.5:1. The map switches to OpenFreeMap's dark style.

### Sheets
- **Bottom sheet:** the trip's plan over the map: white, 22px top corners, the Sheet shadow, a 36 by 5px Hairline grabber that is also a button, snapping with a 380ms cubic-bezier(.2, .9, .25, 1) height transition.
- **Modal sheet:** forms and confirmations: slides up in 220ms (cubic-bezier(.2, .8, .2, 1)) over a Night Ink 30% scrim, 24px top corners, a 40 by 4px grabber, a 36px round close button on Divider. Drag down 110px, or flick, to close; Back and Escape close it.

## Do's and Don'ts

### Do:
- **Do** keep the map on top of every trip and the plan in the sheet, opening at half (56%).
- **Do** number every stop and use the same number and tone for its pin.
- **Do** draw a routed walk as its real path, anything unrouted as the 2px dashed connector, and only the leg into the next or open stop as the solid 3px line on its casing.
- **Do** take every colour from a token, including map pins and lines (read at draw time), so the night palette follows everywhere. Text on a coloured fill is `on-fill`, on an ink fill `on-ink`; never hard-code white.
- **Do** tell a past trip from its ticks only on days someone ticked; a day with no ticks is told from its plan, never listed as missed.
- **Do** keep Route Blue for the route, the next or selected stop, the active tab and the primary action; orange for fixed and to-book; green for done and booked.
- **Do** set every time, duration and amount in tabular figures.
- **Do** give every tappable element the 0.98 press and a 48px minimum height (44px for ticks).
- **Do** let anything over the map float with the Float or Sheet shadow, and let content inside the sheet recede to the Grouped Ground.
- **Do** honour reduced motion: animations and transitions collapse to 1ms and the press stops scaling.

### Don't:
- **Don't** invent a visual world: no custom display face, decorative gradients, textures or illustrated chrome. The category standard is the brand.
- **Don't** colour a merged pin group blue; groups are ink.
- **Don't** draw stop-to-stop connectors solid; they are order, not real paths.
- **Don't** spell out status in words beyond "To book" and "Pick one"; use tone and fill.
- **Don't** put shadows on content inside a sheet or on grouped rows beyond the Card hairline.
- **Don't** float "Ask Claude" over the map; it belongs on the day (and "Plan with Claude" on the next trip), where it knows its context.
- **Don't** use Danger Red for anything but destructive actions and errors, or Faint Slate for text that must be read.
