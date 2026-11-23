// Projectnummer: kort, puur numeriek (geen letters die bij het
// doorbellen of overtikken verward worden, zoals V/B of O/0). De
// database bewaart alleen het reeksnummer (zie migratie
// 0073_project_number.sql); hier plakken we er voor weergave een Luhn-
// controlecijfer achteraan. Tikt iemand één cijfer verkeerd, dan klopt
// de check bijna altijd niet meer — zonder controlecijfer zou een
// typefout soms stilletjes op een ánder, toevallig bestaand projectnummer
// uitkomen, wat later bij automatische e-mailherkenning gevaarlijk is.
export function computeCheckDigit(sequence: number): number {
  const digits = String(sequence).split("").map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    const posFromRight = digits.length - i;
    let v = d;
    if (posFromRight % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  });
  return (10 - (sum % 10)) % 10;
}

export function formatProjectNumber(sequence: number | null | undefined): string {
  if (sequence == null) return "";
  return `${sequence}${computeCheckDigit(sequence)}`;
}

// Haalt uit een los getypt/geplakt nummer (met controlecijfer) het
// onderliggende reeksnummer, maar alleen als de check klopt — anders
// null. Nog niet gebruikt, maar dit is de bouwsteen voor het straks
// herkennen van projectnummers in binnenkomende e-mail.
export function parseProjectNumber(full: string): number | null {
  const digits = full.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const sequence = Number(digits.slice(0, -1));
  const checkDigit = Number(digits.slice(-1));
  if (computeCheckDigit(sequence) !== checkDigit) return null;
  return sequence;
}
