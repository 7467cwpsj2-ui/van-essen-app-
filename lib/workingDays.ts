export function isWeekendDate(d: Date): boolean {
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
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
