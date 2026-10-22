-- What the media_outlets.audience number means.
alter table public.media_outlets
  add column if not exists audience_type text not null default 'followers';

alter table public.media_outlets
  drop constraint if exists media_outlets_audience_type_check;

alter table public.media_outlets
  add constraint media_outlets_audience_type_check
  check (audience_type in ('followers', 'monthly_views', 'email', 'print'));

update public.media_outlets
set audience_type = 'monthly_views'
where name = 'Compasses Architecture & Design';
