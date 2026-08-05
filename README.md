# Van Essen Bouwmanagement — Fase 1 + 2

Productieversie (in opbouw) van de bouwmanagement-app voor Van Essen Bouw &
Onderhoud. Gebaseerd op het klikbare prototype (`projectplanning_1.jsx`) en
het overdrachtsdocument (`van-essen-app-overdracht_2.md`).

**Fase 1 bevat:** rollen &amp; rechten (team/klanten beheren, per module
en per project), projecten aanmaken, planning, bouwplanning, documenten
(tekeningen &amp; foto's) en meerwerk-/minderwerkgoedkeuring met digitale
handtekening.

**Fase 2 bevat:** groepschat per project, privéchat tussen eigenaar en
klant (nooit zichtbaar voor team), notities (met zichtbaarheid alleen ik /
team / team+klant), opleverpunten (verantwoordelijke meldt gereed, klant
keurt goed), klantkeuzes, en het opleverdossier — financiële samenvatting,
garantie-items, en de afsluitende digitale handtekening die het hele
project permanent vergrendelt.

**Bewust nog niet gebouwd:** uren, veiligheid, financieel/nacalculatie
(los van het offertebedrag dat het opleverdossier gebruikt), sjablonen.
Die volgen in latere fases.

## Techstack

- Next.js 14 (App Router) + TypeScript
- Supabase: Postgres (met Row Level Security), Auth, Storage
- Rechten worden afgedwongen op databaseniveau (RLS), niet alleen in de UI

## Opzetten

### 1. Supabase-project

Maak een project aan op [supabase.com](https://supabase.com) en voer de
migraties uit — via de SQL-editor in het dashboard (plak de inhoud van elk
bestand in `supabase/migrations/` op volgorde, `0001_init.sql` eerst,
daarna `0002_fase2.sql`, en klik telkens Run), of met de Supabase CLI:

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

Dit maakt alle tabellen, RLS-policies, RPC's en de storage-bucket
(`project-files`) aan. Draai je al een bestaand project met alleen
`0001_init.sql`? Dan hoef je nu alleen `0002_fase2.sql` nog te draaien —
die bouwt voort op wat er al staat.

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
  bouwen). Loop na het draaien van `0002_fase2.sql` de belangrijkste
  nieuwe paden even door: een chatbericht sturen (groep en privé), een
  notitie toevoegen met elke zichtbaarheidsoptie, een opleverpunt gereed
  melden en laten goedkeuren, een klantkeuze laten kiezen/afwijzen, en
  tot slot het opleverdossier invullen en ondertekenen — controleer
  daarna dat het project echt overal vergrendeld is (probeer als
  eigenaar nog iets te wijzigen, dat hoort te mislukken).
- E-mailsjablonen van Supabase Auth linken standaard met
  `?token_hash=&type=`; `app/auth/callback/route.ts` ondersteunt zowel dat
  formaat als het PKCE-`code`-formaat. Controleer dit bij afwijkende
  Supabase Auth-instellingen.
- Sidebar-projectkaarten tonen nog een placeholder-icoon i.p.v. de laatste
  projectfoto (dat vereist per project een signed-URL-lookup bij elke
  paginalaad — bewust simpel gehouden voor fase 1).
