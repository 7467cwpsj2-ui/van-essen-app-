# Van Essen Bouwmanagement — Fase 1

Productieversie (in opbouw) van de bouwmanagement-app voor Van Essen Bouw &
Onderhoud. Gebaseerd op het klikbare prototype (`projectplanning_1.jsx`) en
het overdrachtsdocument (`van-essen-app-overdracht_2.md`).

**Deze fase bevat:** rollen &amp; rechten (team/klanten beheren, per module
en per project), projecten aanmaken, planning, bouwplanning, documenten
(tekeningen &amp; foto's) en meerwerk-/minderwerkgoedkeuring met digitale
handtekening.

**Bewust nog niet gebouwd:** chat, opleverpunten, klantkeuzes, financieel,
nacalculatie, uren, veiligheid, opleverdossier, sjablonen. Die volgen in
latere fases.

## Techstack

- Next.js 14 (App Router) + TypeScript
- Supabase: Postgres (met Row Level Security), Auth, Storage
- Rechten worden afgedwongen op databaseniveau (RLS), niet alleen in de UI

## Opzetten

### 1. Supabase-project

Maak een project aan op [supabase.com](https://supabase.com) en voer de
migratie uit — via de SQL-editor in het dashboard, of met de Supabase CLI:

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

Dit maakt alle tabellen, RLS-policies, RPC's en de storage-bucket
(`project-files`) aan.

### 2. Eerste eigenaarsaccount

Er is bewust geen self-signup. Maak in het Supabase-dashboard
(Authentication → Users → Invite user) het eerste account aan, en koppel
het daarna aan de eigenaar-rol via de SQL-editor:

```sql
insert into profiles (id, role, name)
values ('<auth-user-uuid>', 'eigenaar', 'Rody van Essen');
```

Team- en klantaccounts nodig je daarna uit via de app zelf
(Team / Klanten in de zijbalk), die dit voor je regelt.

### 3. Omgevingsvariabelen

```bash
cp .env.example .env.local
```

Vul in met de waarden uit Project Settings → API in het Supabase-dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (alleen server-side, nooit naar de client sturen)
- `NEXT_PUBLIC_SITE_URL` (voor uitnodigingsmails)

### 4. Draaien

```bash
npm install
npm run dev
```

## Bekende beperkingen van deze ronde

- Getest met `npm run typecheck` en `npm run build`; **niet** getest tegen
  een live Supabase-project (geen credentials beschikbaar tijdens het
  bouwen). Loop na het invullen van je eigen Supabase-project de
  belangrijkste paden even door: inloggen, teamlid/klant uitnodigen,
  project aanmaken, taak toevoegen, bouwplanning-fase toevoegen, tekening/
  foto uploaden, meerwerk aanmaken + door de klant laten goedkeuren met
  handtekening.
- E-mailsjablonen van Supabase Auth linken standaard met
  `?token_hash=&type=`; `app/auth/callback/route.ts` ondersteunt zowel dat
  formaat als het PKCE-`code`-formaat. Controleer dit bij afwijkende
  Supabase Auth-instellingen.
- Sidebar-projectkaarten tonen nog een placeholder-icoon i.p.v. de laatste
  projectfoto (dat vereist per project een signed-URL-lookup bij elke
  paginalaad — bewust simpel gehouden voor fase 1).
