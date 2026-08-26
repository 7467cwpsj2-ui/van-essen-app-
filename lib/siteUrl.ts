// Eén centrale plek voor het basis-adres van de site, gebruikt overal
// waar een volledige, deelbare URL wordt opgebouwd (opleverdossier-
// link, agenda-koppeling, ...). Een eventuele trailing slash in de
// omgevingsvariabele wordt hier weggehaald — anders ontstaat er een
// dubbele "/" zodra er een pad achteraan wordt geplakt (bv.
// "https://site.nl//api/agenda/xyz"), wat sommige apps (zoals Apple's
// Agenda-abonnement) niet als geldige URL herkennen.
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
