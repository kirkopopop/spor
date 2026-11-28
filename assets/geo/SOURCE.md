# countries-110m.json

Natural Earth 1:110m admin-0 countries (public domain), from
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Slimmed for tur: properties reduced to `iso` (ISO_A2_EH, so France and Norway keep their codes)
and `name`; coordinates rounded to 0.01°. Used to shade the countries you've been to on the globe.

# airports.json

OurAirports (public domain), from https://davidmegginson.github.io/ourairports-data/airports.csv,
slimmed by `node scripts/build-airports.mjs <airports.csv>` to airports with scheduled service and an
IATA code, as `[iata, name, city, country, lat, lng]` (coordinates to 0.001°). Turns a flight's codes
into its distance and countries.
