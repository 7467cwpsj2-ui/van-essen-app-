// Projectnummer: jaartal + een volgnummer dat elk jaar weer bij 1
// begint (zie migratie 0074_project_number_year.sql) — zo is in één
// oogopslag te zien uit welk jaar een project/klus komt, en het nummer
// loopt binnen een jaar gewoon netjes op in plaats van willekeurig te
// lijken. Het laatste cijfer is een Luhn-controlecijfer over jaar +
// volgnummer samen: tikt iemand één cijfer verkeerd (ook in het
// jaartal), dan klopt de check bijna altijd niet meer — belangrijk
// voor als er later automatisch op dit nummer gezocht wordt in e-mail.
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

function payloadFor(year: number, sequence: number): string {
  return `${year}${String(sequence).padStart(3, "0")}`;
}

export function formatProjectNumber(year: number | null | undefined, sequence: number | null | undefined): string {
  if (year == null || sequence == null) return "";
  const payload = payloadFor(year, sequence);
  return `${year}-${payload.slice(4)}-${luhnCheckDigit(payload)}`;
}

// Haalt jaar + volgnummer uit een los getypt/geplakt projectnummer,
// maar alleen als het controlecijfer klopt — anders null. Nog niet
// gebruikt, maar dit is de bouwsteen voor het straks herkennen van
// projectnummers in binnenkomende e-mail.
export function parseProjectNumber(full: string): { year: number; sequence: number } | null {
  const digits = full.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const payload = digits.slice(0, -1);
  const checkDigit = Number(digits.slice(-1));
  if (luhnCheckDigit(payload) !== checkDigit) return null;
  return { year: Number(payload.slice(0, 4)), sequence: Number(payload.slice(4)) };
}
