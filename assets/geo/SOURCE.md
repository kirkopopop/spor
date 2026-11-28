# countries-50m.json

Natural Earth 1:50m admin-0 countries (public domain), from
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson

Slimmed by `node scripts/build-countries.mjs <ne_50m_admin_0_countries.geojson>`: properties reduced to
`iso` (ISO_A2_EH, so France and Norway keep their codes) and `name`, coordinates rounded to 0.01°, one
feature per code (Somaliland folded into Somalia, N. Cyprus into Cyprus). Used to shade the countries
you've been to on the globe and the flight map. 1:50m follows real borders and coastlines closely and
includes small countries (Malta, Singapore, Andorra…) that 1:110m leaves out.

# airports.json

OurAirports (public domain), from https://davidmegginson.github.io/ourairports-data/airports.csv,
slimmed by `node scripts/build-airports.mjs <airports.csv>` to airports with scheduled service and an
IATA code, as `[iata, name, city, country, lat, lng]` (coordinates to 0.001°). Turns a flight's codes
into its distance and countries.

# cities.json

Natural Earth 1:10m populated places (public domain), from
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places_simple.geojson,
slimmed by `node scripts/build-cities.mjs <ne_10m_populated_places_simple.geojson>` to
`[name, iso, lat, lng, population, capital, other names]` (about 7,300 cities, coordinates to 0.01°).
Population is `pop_max` (the metro area where known). Gives the travel highlights their sizes and capitals.
