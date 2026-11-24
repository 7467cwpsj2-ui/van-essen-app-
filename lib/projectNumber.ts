// Projectnummer: (korte) jaartal + een volgnummer dat elk jaar weer bij
// 1 begint (zie migratie 0074_project_number_year.sql) — zo is in één
// oogopslag te zien uit welk jaar een project/klus komt, en het nummer
// loopt binnen een jaar gewoon netjes op in plaats van willekeurig te
// lijken. Het laatste cijfer is een Luhn-controlecijfer over jaar +
// volgnummer samen (zoals getoond, dus het verkorte 2-cijferige jaar):
// tikt iemand één cijfer verkeerd, dan klopt de check bijna altijd niet
// meer — belangrijk voor als er later automatisch op dit nummer gezocht
// wordt in e-mail. In de database blijft het volledige jaartal staan
// (project_number_year), dit bestand bepaalt alleen hoe het getoond
// wordt.
function luhnCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const posFromRight = digits.length - i;
    let v = Number(digits[i]);
    if (posFromRight % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  return (10 - (sum % 10)) % 10;
}

function shortYear(year: number): string {
  return String(year % 100).padStart(2, "0");
}

// Voorloopnullen van het volgnummer zijn puur cosmetisch (voor
// uitlijning in de weergave) — het controlecijfer wordt daarom altijd
// herberekend over deze vaste, opgevulde vorm, nooit over de cijfers
// zoals iemand ze toevallig heeft getypt. Zo komt "26-3-7" (zonder
// voorloopnullen, zoals een leverancier het typt) op exact hetzelfde
// controlecijfer uit als "26-003-7".
function payloadFor(year: number, sequence: number): string {
  return `${shortYear(year)}${String(sequence).padStart(3, "0")}`;
}

export function formatProjectNumber(year: number | null | undefined, sequence: number | null | undefined): string {
  if (year == null || sequence == null) return "";
  const payload = payloadFor(year, sequence);
  return `${payload.slice(0, 2)}-${payload.slice(2)}-${luhnCheckDigit(payload)}`;
}

// Zelfde nummer als formatProjectNumber, maar zonder de koppeltekens —
// dit is wat de kopieerknop meegeeft, zodat plakken in een mail/factuur
// altijd de juiste cijfers oplevert zonder dat iemand zelf nog
// streepjes moet overtypen (of per ongeluk weglaat).
export function formatProjectNumberPlain(year: number | null | undefined, sequence: number | null | undefined): string {
  return formatProjectNumber(year, sequence).replace(/-/g, "");
}

// Haalt jaar + volgnummer uit een los getypt/geplakt projectnummer, en
// controleert dat tegen een vers herberekend controlecijfer (dus
// onafhankelijk van streepjes, spaties, of ontbrekende voorloopnullen
// in het volgnummer) — anders null. Nog niet gebruikt, maar dit is de
// bouwsteen voor het straks herkennen van projectnummers in
// binnenkomende e-mail/facturen, ook als een leverancier het nummer
// zonder streepjes en zonder voorloopnullen overneemt (bijv. "2637"
// i.p.v. "26-003-7"). Het 2-cijferige jaar wordt aangenomen in de
// 2000-2099 range.
export function parseProjectNumber(full: string): { year: number; sequence: number } | null {
  const digits = full.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const yearDigits = digits.slice(0, 2);
  const sequence = Number(digits.slice(2, -1));
  const checkDigit = Number(digits.slice(-1));
  if (!sequence || sequence < 1) return null;
  const year = 2000 + Number(yearDigits);
  if (luhnCheckDigit(payloadFor(year, sequence)) !== checkDigit) return null;
  return { year, sequence };
}
