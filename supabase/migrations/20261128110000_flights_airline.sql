-- The airline a flight was with, as typed ("SAS", "Norwegian"); optional.
alter table public.flights add column airline text check (airline is null or char_length(airline) between 1 and 60);
