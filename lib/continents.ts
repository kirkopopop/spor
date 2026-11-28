// Which continent each country is on: Natural Earth's grouping (Russia in Europe, Turkey and the
// Caucasus in Asia), with its island "Seven seas" placed on their nearest continent.
export const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania", "Antarctica"] as const;
export type Continent = (typeof CONTINENTS)[number];

const TABLE: Record<Continent, string> = {
  "Europe": "AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK",
  "Asia": "AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IO IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE",
  "Africa": "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  "North America": "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  "South America": "AR BO BR CL CO EC FK GF GS GY PE PY SR UY VE",
  "Oceania": "AS AU CC CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
  "Antarctica": "AQ BV HM TF",
};

const byCountry = new Map<string, Continent>();
for (const c of CONTINENTS) for (const iso of TABLE[c].split(" ")) byCountry.set(iso, c);

export const continentOf = (iso: string): Continent | undefined => byCountry.get(iso);

/** Countries by continent, in the order above; continents with none are left out. */
export function byContinent(countries: Iterable<string>): { continent: Continent; countries: string[] }[] {
  const out = new Map<Continent, string[]>();
  for (const iso of countries) {
    const c = continentOf(iso);
    if (c) out.set(c, [...(out.get(c) ?? []), iso]);
  }
  return CONTINENTS.filter((c) => out.has(c)).map((c) => ({ continent: c, countries: out.get(c)! }));
}
