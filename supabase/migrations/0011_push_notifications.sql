-- Web Push: onthoudt per ingelogde gebruiker op welk toestel/browser
-- een pushmelding afgeleverd mag worden. Verzenden gebeurt altijd
-- server-side met de service-role sleutel (nooit rechtstreeks vanuit
-- de client naar andermans abonnement), dus de RLS hier hoeft alleen
-- de eigenaar van een abonnement zichzelf toegang te geven.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_select on push_subscriptions for select
  using (user_id = auth.uid());
create policy push_subscriptions_insert on push_subscriptions for insert
  with check (user_id = auth.uid());
create policy push_subscriptions_update on push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_delete on push_subscriptions for delete
  using (user_id = auth.uid());
