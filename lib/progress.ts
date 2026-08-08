import type { SchedulePhase } from "@/types/database";

const DAY_MS = 86400000;

function isWeekend(ms: number): boolean {
  const wd = new Date(ms).getUTCDay();
  return wd === 0 || wd === 6;
}

// Aantal werkdagen (ma-vr) tussen twee tijdstippen, inclusief beide
// grenzen — zaterdag/zondag tellen niet mee, er wordt dan niet gewerkt.
function workingDaysBetween(startMs: number, endMs: number): number {
  if (endMs < startMs) return 0;
  let count = 0;
  for (let t = startMs; t <= endMs; t += DAY_MS) {
    if (!isWeekend(t)) count++;
  }
  return count;
}

// Voortgang van een project in procenten, per fase gewogen naar rato
// van de duur van die fase in werkdagen (langere fases wegen zwaarder),
// op basis van hoeveel werkdagen er al verstreken zijn binnen elke
// fase-periode — het weekend telt niet mee, dus de balk staat dan
// stil. "Planning" is een losstaande te-doen-lijst en telt hier
// bewust niet in mee.
export function projectProgress(phases: SchedulePhase[]): number {
  if (!phases.length) return 0;
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;
  phases.forEach((ph) => {
    const start = new Date(ph.start_date).getTime();
    const end = new Date(ph.end_date).getTime();
    const weight = Math.max(1, workingDaysBetween(start, end));

    let dateRatio: number;
    if (now >= end) dateRatio = 1;
    else if (now <= start) dateRatio = 0;
    else dateRatio = workingDaysBetween(start, now) / weight;

    weightedSum += dateRatio * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
}
