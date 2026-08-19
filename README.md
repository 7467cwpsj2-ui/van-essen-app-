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
bestand in `supabase/migrations/` op volgorde: `0001_init.sql`,
`0002_fase2.sql`, `0003_uren_nacalculatie.sql`, `0004_notes_review.sql`,
`0005_realtime.sql`, `0006_completion_point_photo.sql`,
`0007_reminders.sql`, `0008_task_multi_assignee.sql`,
`0009_minderwerk_days.sql`, `0010_working_days.sql`,
`0011_push_notifications.sql`, `0012_project_cover_photo.sql`,
`0013_fix_user_delete.sql`, `0014_task_klant_owner_only.sql`,
`0015_extra_work_vat.sql`, `0016_client_completion_points.sql`,
`0017_note_client_only_visibility.sql`, `0018_note_team_members.sql`,
`0019_note_edit_text.sql`, `0020_tasks_visible_to_assignee_only.sql`,
`0021_extra_work_attachment.sql`, `0022_privechat_attachments.sql`,
`0023_project_planning_color.sql`, `0024_team_member_type.sql`,
`0025_schedule_phase_multi_assignee.sql`, `0026_review_requests.sql`,
`0027_nacalculatie_kosten.sql`, `0028_fix_notes_team_visibility.sql`,
`0029_quick_jobs.sql`, `0030_extra_work_schedule_toggle.sql`,
`0031_schedule_phase_fixed_date.sql`,
`0032_quick_jobs_team_visibility.sql`, `0033_calc_vat_type.sql`, `0034_hourly_rate_vat.sql`,
`0035_cost_item_supplier.sql`, `0036_dossier_extras.sql`, `0037_leads.sql`,
`0038_notifications.sql`, `0039_approve_extra_work_idempotent.sql`,
`0040_project_client_access.sql`,
`0041_project_client_access_select.sql`, en klik telkens
Run), of met de Supabase CLI:

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

Dit maakt alle tabellen, RLS-policies, RPC's en de storage-bucket
(`project-files`) aan. Draai je al een bestaand project met een deel van
deze migraties? Dan hoef je alleen de ontbrekende, latere bestanden nog
te draaien — ze bouwen op elkaar voort.

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
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (optioneel, voor
  pushmeldingen — genereer een sleutelpaar met `npx web-push
  generate-vapid-keys`; zonder deze variabelen blijft push simpelweg
  uitgeschakeld, de rest van de app werkt gewoon door)
- `CRON_SECRET` (optioneel maar aanbevolen, beveiligt de dagelijkse
  deadline-herinnering — zie `vercel.json`; verzin een lange
  willekeurige waarde en zet 'm ook als environment variable in Vercel,
  die stuurt 'm dan automatisch mee bij het aanroepen van de cron)
- `ANTHROPIC_API_KEY` (optioneel, alleen nodig voor de "Facturen"-pagina
  — laat PDF-facturen automatisch uitlezen en aan de nacalculatie
  toevoegen. Zelf aan te maken op console.anthropic.com)

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
- `app/auth/callback/page.tsx` verwerkt de link uit uitnodigings-/
  reset-mails van Supabase Auth client-side, en ondersteunt alle
  formaten die Supabase gebruikt (`#access_token=...`-fragment,
  `?code=`, en `?token_hash=&type=`) — geen aanpassingen aan de
  e-mailsjablonen in het Supabase-dashboard nodig.
- Sidebar-projectkaarten tonen nog een placeholder-icoon i.p.v. de laatste
  projectfoto (dat vereist per project een signed-URL-lookup bij elke
  paginalaad — bewust simpel gehouden voor fase 1).
