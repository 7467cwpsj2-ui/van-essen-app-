import type { SchedulePhase } from "@/types/database";

const DAY_MS = 86400000;

// Voortgang van een project in procenten, per fase gewogen naar rato
// van de duur van die fase (langere fases wegen zwaarder), op basis
// van hoever de tijd binnen elke fase-periode verstreken is. "Planning"
// is een losstaande te-doen-lijst en telt hier bewust niet in mee.
export function projectProgress(phases: SchedulePhase[]): number {
  if (!phases.length) return 0;
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;
  phases.forEach((ph) => {
    const start = new Date(ph.start_date).getTime();
    const end = new Date(ph.end_date).getTime();
    const weight = Math.max(1, Math.round((end - start) / DAY_MS) + 1);

    let dateRatio: number;
    if (now >= end) dateRatio = 1;
    else if (now <= start) dateRatio = 0;
    else dateRatio = (now - start) / Math.max(1, end - start);

    weightedSum += dateRatio * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
}
