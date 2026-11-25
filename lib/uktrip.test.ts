import { describe, expect, it } from "vitest";
import { convertUkTrip } from "./uktrip";

const SRC = `
var DAYS = [
 { id:"sat", iso:"2026-11-21", city:"edinburgh", place:"London → Edinburgh", title:"Early train", rain:["Museum."],
   stops:[
    {t:"06:30", n:"LNER to Edinburgh", k:"fixed", chk:"lner", tr:"train", go:{m:"walk",min:5,leave:"06:05"}, off:true},
    {t:"10:40", n:"Left luggage", go:{m:"train",min:250}, ll:[55.95,-3.18], q:"Waverley"},
    {t:"~23:30", n:"Back to the hotel", k:"opt", more:"<p>Plan B: <b>taxi</b>.</p><p>Call 0777.</p>",
     subs:[["A","first","qa"],["B","second","qb"]], pick:"x"}
   ]}
];
var TRIP = { key:"uktrip", name:"UK", tz:"Europe/London", people:["Kirill","Dima"] };
var SPARE = [["Museum","edinburgh","Old Town","Free.",true,60,[55.9,-3.1],"museum"]];
var BUDGET = [["Stay",["stay"],80,100]];
var CHECK = [["lner","LNER","Refunded","Done",true],["tour","Tour","","",false]];
`;

describe("convertUkTrip", () => {
  const trip = convertUkTrip(SRC, "memory");
  const stops = trip.days[0].stops;

  it("keeps travel on the first stop of the day, with its leave time", () => {
    expect(stops[0].go).toEqual({ mode: "walk", min: 5, leave: "06:05" });
  });

  it("gives every stop and option a stable, unique uuid", () => {
    const ids = [...stops.map((s) => s.id), ...stops.flatMap((s) => s.options?.map((o) => o.id) ?? [])];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("splits approximate times into time + approx", () => {
    expect(stops[2]).toMatchObject({ time: "23:30", approx: true, kind: "optional", pickOne: true });
    expect(stops[0].approx).toBeUndefined();
  });

  it("keeps bold and paragraphs from the extra notes", () => {
    expect(stops[2].more).toBe("Plan B: **taxi**.\n\nCall 0777.");
  });

  it("maps bookings, budget and spare ideas", () => {
    expect(trip.bookings.map((b) => b.status)).toEqual(["booked", "to_book"]);
    expect(trip.budget).toEqual([{ category: "stay", label: "Stay", planned: 200 }]);
    expect(trip.spare[0]).toMatchObject({ name: "Museum", indoor: true, minutes: 60 });
    expect(stops[0].bookingId).toBe("lner");
  });
});
