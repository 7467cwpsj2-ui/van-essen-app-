export function isWeekendDate(d: Date): boolean {
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
}

// ISO-8601 weeknummer (week 1 is de week met de eerste donderdag van het jaar).
export function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // ma = 0 .. zo = 6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // dichtstbijzijnde donderdag
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

// Geeft de maandag van de week waarin `dateIso` valt.
export function mondayOfWeek(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  const wd = d.getUTCDay(); // 0 = zondag .. 6 = zaterdag
  const diff = wd === 0 ? -6 : 1 - wd;
  const monday = new Date(d.getTime() + diff * 86400000);
  return monday.toISOString().slice(0, 10);
}

// De vijf werkdagen (ma t/m vr) van de week waarin `dateIso` valt.
export function weekdaysOfWeek(dateIso: string): string[] {
  const monday = new Date(mondayOfWeek(dateIso) + "T00:00:00Z");
  return Array.from({ length: 5 }, (_, i) => new Date(monday.getTime() + i * 86400000).toISOString().slice(0, 10));
}

// Geeft de einddatum van een periode die op `startIso` begint en
// `days` werkdagen duurt (de startdatum zelf telt als dag 1) —
// zaterdag/zondag tellen niet mee bij het doortellen.
export function endDateForWorkingDays(startIso: string, days: number): string {
  if (!startIso || !(days >= 1)) return startIso;
  let d = new Date(startIso + "T00:00:00Z");
  let remaining = Math.floor(days) - 1;
  while (remaining > 0) {
    d = new Date(d.getTime() + 86400000);
    if (!isWeekendDate(d)) remaining--;
  }
  return d.toISOString().slice(0, 10);
}
