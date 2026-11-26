---
name: tur-planning
description: Use when planning a trip, or changing a planned trip, for Kirill and Tanya's household in tur (their private trip app). Gathers, researches, drafts and stress-tests the plan in conversation, then writes it into tur through the tur connector. Also use when asked what changed in a trip, or to adjust a trip after the travellers edited it.
---

# Plan a trip into tur

tur is where Kirill and Tanya's trips live and run on their phones: day timelines, stops with travel and leave-by times, "Pick one" options, bookings, budget, rain plans and spare-time ideas. Planning happens here in conversation; the result is written into tur with the **tur connector** tools. Nothing is built or published: once written, it is on both phones.

The travellers also edit tur by hand (pick options, tick stops, move times, add expenses). Their edits win. Never overwrite them from an older copy.

## Process

1. **Read tur first.** `list_trips`, then `get_trip` for the trip. Read `notes` (requests from Kirill or Tanya, often "can we skip…" or "add…") and `recent_activity` (picks, ticks, moved or added stops). Keep every edit; act on the notes or say why not; mention anything that changes the plan ("Tanya picked Augustiner for Tuesday dinner, so I moved the walk to fit"). Remember the trip's `revision`: every write must pass it as `expected_revision`.
2. **Gather before planning.** Dates, who is travelling (Oscar is a baby: naps, early bedtime, pram access), arrival and departure times and airports, where they sleep each night, what is already booked, must-dos, budget feel, pace, and what they do not want. Check memory and past chats before asking. Ask only what you cannot find.
3. **Research with web search.** Opening hours for the exact weekday and date (holidays: Christmas Eve and Day close many places), prices, booking windows, journey times from a journey planner, sunset, seasonal events. Note the date checked. Never state an hour, price or duration from memory.
4. **Draft the plan in the conversation** following the planning rules below. Show it day by day as short rows (time, name, status) so it can be read quickly.
5. **Stress-test before writing**, then say what you found:
   - Walk each day in order: every hop physically possible in the time given.
   - Track the bags hour by hour; check left-luggage and hotel desk hours.
   - The heaviest day must not land on the least sleep.
   - At least 15 minutes of slack before every fixed time.
   - An indoor swap near every outdoor block.
   - Budget against what is actually booked, including every hotel night.
6. **Write to tur** once the person agrees with the draft (see "Writing" below). Write the whole trip in one go, in the order given.
7. **Report in plain words** what is now in tur: days written, stops added or changed, what is still "To book", picks left open, and anything the stress-test flagged. Say what you changed, not how you called the tools.

## Writing to tur

Order matters, because stops point at bookings and days:

1. **New trip:** `create_trip` with name, dates, the destination's IANA timezone, currency, everyone's first names, stage `planning`. Days are created for each date. **Existing trip:** use its id; change dates or stage with `update_trip`.
   Name the trip after where it goes ("Munich", "Lisbon & Porto", "Edinburgh weekend"), not the occasion ("Christmas break"): tur reads the destination from the name to give the trip its landmark icon and photo, then falls back to the days' `city`/`place`, and only last to the timezone.
2. **`upsert_bookings`**: one row per thing to book or already booked (flights, every hotel stay, timed tickets, restaurant tables). `status` is `booked` only if it really is. One-line `note`, `est_cost` when known. Booking references go in `private_ref`, never in stop text. Keep the returned ids.
3. **`upsert_days`**: for each date a `title` of at most 40 characters (the day's shape: "Arrive · Altstadt", "Zugspitze day"), `city` as a lowercase slug ("munich") that the spare ideas will share, `place` (what shows under the date tab, e.g. "Munich" or "Munich → Garmisch"), a short `intro`, and a `rain` plan of 1–3 sentences saying what to swap if it is wet. Always fill `city` and `place`: they also tell tur where the trip goes.
4. **`upsert_stops`**: per day or for the whole trip in one batch. See the rules for what each stop needs.
5. **`set_budget`**: replaces the plan. Totals for the whole party per category (e.g. flights, stay, food, transport, tickets), covering every booking and hotel night.
6. **`upsert_spare_ideas`**: at least three indoor ideas per city, with `minutes`, `indoor`, coordinates and a one-line note.

**Changing a trip:** always `get_trip` first and use the ids it returns. To move a stop, send it again with its `id` and the new `date`/`time`. Delete only stops that are really gone (`delete_stops`), and never one a traveller just ticked or picked without asking. Change the bookings list and budget together with the stops they belong to.

**Revisions.** Each write returns the trip's new `revision`; pass that one to the next write. If a write says **"the trip changed since you read it"**, someone edited the trip meanwhile (Kirill or Tanya in the app, or the other one's Claude). Call `get_trip` again, keep their change, redo your change on top, and retry with the new revision. Never work around it.

**If a tool says "Nothing was written. Fix and retry"**, it lists exactly what is wrong (a day outside the trip, a booking from another trip, a title over 40 characters…). Fix those items and send the same call again. Nothing partial was saved.

**Answering notes.** When you act on a traveller's note, leave a short `add_note` on the same stop or day saying what you did ("Moved the museum to Wednesday morning"). If you can't do it, say why in a note too.

Times are `HH:MM`, 24-hour, local to the trip's timezone. tur computes leave-by times itself (travel minutes plus 15 minutes of slack before fixed stops); set `go.leave` only when the real answer differs (a train you must catch earlier).

**Walks are routed by tur.** When a stop is reached on foot (`go.mode: "walk"`) and both it and the stop right before it have coordinates, tur draws the walk along the real streets and shows its own walking time in the list, the stop sheet and the leave-by, in place of your minutes. Your minutes are still stored and are the fallback (offline, or a walk tur can't route). It can't route a walk that starts right after a stop with no place on the map (a train, a flight): there your minutes are what people see. Tube, train, bus and taxi legs are never routed: your journey-planner minutes are what people see, so get those right.

**Ticks are the trip's memory.** Once a trip ends, tur builds its Memory recap from the stops Kirill and Tanya ticked: places reached, places they didn't make, km on foot, spend. A day nobody ticked is told from its plan, never as "missed". So never tick, untick or re-time a stop on their behalf to tidy the record. When asked to wrap a trip up afterwards, set its stage to `memory` with `update_trip` and leave a short `add_note` on the trip if there is something worth remembering (the notes become its journal).

## Planning rules

1. Every stop has a time. Mark what cannot move as `fixed` (trains, flights, booked slots); mark at least two stops a day `optional` (dropped first if late).
2. Every hop over 5 minutes gets travel on the arriving stop (`go`: mode, minutes from a journey planner, a short `text` saying how). Mark guesses with `est: true`. The first stop of a day gets its travel too: the trip from where they slept. That is often the most important leave-by of the day.
3. A stop that depends on a booking links it with `booking_id`, so booked status lives in one place and shows as ✓ or "To book".
4. Choices become a "Pick one": the options in `options`, with `pick_one: true` (at least two). Do not pick for them unless asked.
5. Every day has a rain plan; each city has at least three indoor spare-time ideas.
6. Anywhere that could be full gets a plan B in `more`.
7. Bags are a stop (drop and collect), with the desk or locker hours in `body`.
8. With a baby: build naps and bedtime in as stops, keep walks pram-friendly, and keep travel days light.
9. Stop names are short and specific (place plus what you do there): the name is all the list shows. The detail goes in `body`, `more`, `options` and `go.text`, which open in the stop's sheet, so write those as fully as is useful.
10. Plain language, exact names and addresses in `maps_query`, prices with `~` when approximate (`fee: { label: "~€25", paid: true }`). Give every stop with a real place its `lat`/`lng` (look them up): a stop without them gets no pin, and the walks into and out of it can't be routed. Only journeys (trains, flights) go without, marked `off_map`.
11. Phone numbers for restaurants are fine in `more`; booking references only in the booking's `private_ref`.

## Asking about changes

When asked "what changed?" or before continuing a plan from an earlier chat, call `get_activity_since` with the time you last wrote (or `get_trip` for the latest 50 changes) and summarise who changed what.
