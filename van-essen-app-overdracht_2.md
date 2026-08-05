# Van Essen Bouw & Onderhoud — Bouwmanagement App
## Overdrachtsdocument: van prototype naar productie

Dit document vat samen wat er in het klikbare prototype is gevalideerd, en wat er nodig is om er een echte, professioneel ogende productie-app van te maken. Bedoeld als startpunt voor een Claude Code-project (of een externe developer).

---

## 1. Merkidentiteit

- **Logo**: "VAN" (blauw) + "ESSEN" (wit), subtitel "BOUW & ONDERHOUD" in blauw, hoofdletters, condensed/bold sans-serif.
- **Kleuren**: achtergrond zwart/antraciet (#050505 / #121316 panelen), accentblauw #3AA9DB, succes-groen #4CAF7D, foutrood #D1554A.
- **Typografie**: Montserrat (koppen, vet), Inter (lopende tekst), IBM Plex Mono (data/bedragen/codes).
- **Sfeer**: strak, donker, premium — vergelijkbaar met Linear/Apple, geen "corporate SaaS" clichébeeld.

---

## 2. Rollen en rechten

Vier rollen: **Eigenaar** (volledige rechten), **Team/onderaannemers**, **Klant**, en impliciet gasten zonder toegang.

- Eigenaar beheert alles: projecten, team, klanten, rechten, sjablonen.
- **Per teamlid** instelbaar: welke onderdelen zichtbaar zijn (planning, bouwplanning, tekeningen, foto's, notities, chat, opleverpunten, klantkeuzes, meerwerk, financieel — financieel staat standaard uit), of ze de bouwplanning mogen bewerken, en **welke specifieke projecten** ze mogen zien (niet iedereen werkt aan alles).
- **Per klant** instelbaar: dezelfde onderdelen-toggle, of ze de bouwplanning mogen bewerken (zelden nodig).
- **Uren** en **Veiligheid** zijn altijd intern (team/eigenaar), nooit klantzichtbaar — dit is een harde regel, geen toggle.
- Onderaannemers/team zien alléén projecten waarvoor ze zijn vrijgegeven; klanten zien alléén hun eigen gekoppelde project(en).

In productie: dit wordt een echt rechtensysteem op databaseniveau (Row Level Security), niet alleen UI-verberging.

---

## 3. Modules (per project, als tabbladen)

| Module | Kern | Bijzonderheden |
|---|---|---|
| **Planning** | Dagelijkse taken (titel, wie, datum, afvinken) | Automatisch gekoppeld aan een fase uit de Bouwplanning; kies je een fase, dan wordt datum/toegewezene voorgesteld |
| **Bouwplanning** | Fasenoverzicht als Excel-achtige dag-Gantt (gekleurde dagvakjes per fase) | Toont per fase live voortgang op basis van gekoppelde taken |
| **Tekeningen** | Titel + toelichting, met echte bestandsupload (foto/PDF) of camera | Klant mag ook zelf toevoegen |
| **Foto's** | Categorie (voor/tijdens/na/oplevering), met upload of camera | — |
| **Notities** | Zichtbaarheid: alleen ik / team / team+klant | Klantnotities zijn standaard alleen voor de eigenaar zichtbaar, tenzij hij ze deelt met het team |
| **Chat** | Groepschat per project | — |
| **Klant & eigenaar (privéchat)** | 1-op-1, nooit zichtbaar voor team | — |
| **Opleverpunten** | Verantwoordelijke kiezen uit team, met melding; alleen die persoon vinkt zelf af | Klant keurt goed zodra status "gereed" is |
| **Klantkeuzes** | Categorie, keuze of afwijzing door de klant | — |
| **Meer-/minderwerk** | Voorstel met bedrag + optionele toelichting (uitklapbaar) | Klant kan **goedkeuren (met handtekening) of afwijzen** — eenmaal beslist, ligt het vast tenzij de eigenaar het wijzigt. Optioneel: "X extra dagen bij fase Y" — bij goedkeuring schuift de bouwplanning automatisch (en omkeerbaar) door |
| **Financieel** | Simpele facturenlijst | Team ziet dit standaard niet |
| **Nacalculatie** | Begroot vs. werkelijk, alleen eigenaar | — |
| **Uren** | Team logt eigen uren; eigenaar ziet totalen | Nooit klantzichtbaar |
| **Veiligheid** | Checklist die team moet bevestigen vóór start | Nooit klantzichtbaar |
| **Opleverdossier** | Statusbanner (open → klaar → ondertekend), opleverdatum, opleverpunten, opleverfoto's, financiële samenvatting (offerte + meer-/minderwerk = eindtotaal), garantie-items (met eenheid: weken/maanden/jaren) | **Digitale handtekening** door de klant sluit het project af: zet automatisch projectstatus op "Afgerond", 100% op alle dashboards, en **vergrendelt het dossier permanent** — niemand kan daarna nog iets wijzigen |

**Sjablonen**: eigenaar legt een fasenstructuur vast (bv. "Standaard dakkapel") met relatieve dagen; nieuw project + startdatum genereert automatisch de bouwplanning.

**Dashboard** (rolafhankelijk): zoekbalk, meldingenbel, projectenoverzicht als fotokaarten met voortgangsbalk, statusverdeling gepland/lopend/afgerond, en klikbare lijsten die direct naar het juiste tabblad springen.

---

## 4. Wat een productieversie écht toevoegt

Dit prototype simuleert een aantal dingen die in productie fundamenteel anders (en beter) moeten:

- **Echte authenticatie** i.p.v. toegangscodes — met e-mail/wachtwoord of magic link, uitnodigingen per project.
- **Echte bestandsopslag** (S3/Supabase Storage) i.p.v. base64 in één 5MB-record — geen limiet op aantal/grootte foto's.
- **Juridisch geldige digitale handtekening** (bv. koppeling met een e-signature dienst) i.p.v. canvas-tekening.
- **Echte pushmeldingen** i.p.v. in-app meldingen.
- **Rechten afgedwongen op databaseniveau** (Row Level Security) i.p.v. alleen in de interface.
- **Echt printen/PDF-export** zonder de omwegen die nu nodig waren voor de preview-omgeving.
- **Offline-ondersteuning** voor onderaannemers op locaties met slecht bereik.

---

## 5. Aanbevolen architectuur

- **Frontend**: Next.js + TypeScript, Tailwind of de bestaande custom CSS (grotendeels herbruikbaar), PWA voor telefoon/tablet/desktop.
- **Backend**: Postgres via Supabase, met Row Level Security die precies het rollen/rechtenmodel hierboven afdwingt.
- **Auth**: Supabase Auth, met project-gebonden uitnodigingen.
- **Bestanden**: Supabase Storage of Cloudflare R2.
- **Realtime**: Supabase Realtime voor chat/meldingen/live planning-updates.
- **Bouwplanning**: een drag-drop Gantt-library (bv. dhtmlx-gantt) met dependency-logica voor automatisch doorschuiven.

**Gefaseerd bouwen** (aanbevolen volgorde):
1. Rollen/rechten, projecten, planning, bouwplanning, documenten, meerwerk-goedkeuring.
2. Chat, opleverpunten, foto's, notificaties.
3. Financieel, facturen-koppeling (bv. Moneybird), uren, sjablonen.
4. AI-uitbreidingen, koppelingen, geavanceerde rapportages.

---

## 6. Wat er direct herbruikbaar is

De React-componentstructuur en CSS uit het prototype (kleuren, typografie, kaartlay-outs, de Gantt-styling, de fotokaart-styling) kunnen vrijwel 1-op-1 als startpunt dienen voor de Next.js-componenten — dat scheelt aanzienlijk designwerk. De datamodellen die in dit document staan (per module) zijn direct te vertalen naar databasetabellen.
