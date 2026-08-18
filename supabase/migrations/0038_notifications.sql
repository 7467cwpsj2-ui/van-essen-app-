-- Meldingencentrum: elke pushmelding wordt voortaan ook hier bewaard,
-- per ontvanger, zodat iemand een melding nog in de app zelf terugziet
-- ook als de pushmelding het toestel nooit bereikt heeft (bv. door een
-- niet-actueel abonnement, geen toestemming, of gewoon een gemiste
-- melding). Verzenden gebeurt altijd server-side met de service-role
-- sleutel (zelfde patroon als push_subscriptions), dus RLS hoeft hier
-- alleen de eigenaar van een melding zichzelf toegang te geven.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_select on notifications for select
  using (user_id = auth.uid());
create policy notifications_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
