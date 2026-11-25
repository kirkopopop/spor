-- Notes Claude writes run as the person who connected it; mark them so the app shows "Claude".
alter table public.notes add column via text check (via in ('claude'));
