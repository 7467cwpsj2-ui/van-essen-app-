import type { SchedulePhase, Task } from "@/types/database";

const DAY_MS = 86400000;

// Voortgang van een project in procenten: taken die aan een fase hangen
// tellen mee naar rato van de duur van die fase (langere fases wegen
// zwaarder); fases zonder gekoppelde taken vallen terug op de datum
// (verstreken = klaar, nog niet begonnen = 0%). Zonder bouwplanning
// telt gewoon het aandeel afgevinkte taken. Poort van projectProgress()
// uit het prototype (projectplanning_1.jsx:1245-1275).
export function projectProgress(phases: SchedulePhase[], tasks: Task[]): number {
  if (!phases.length) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    return total ? Math.round((done / total) * 100) : 0;
  }
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;
  phases.forEach((ph) => {
    const start = new Date(ph.start_date).getTime();
    const end = new Date(ph.end_date).getTime();
    const weight = Math.max(1, Math.round((end - start) / DAY_MS) + 1);
    const linked = tasks.filter((t) => t.phase_id === ph.id);
    let ratio: number;
    if (linked.length) {
      ratio = linked.filter((t) => t.done).length / linked.length;
    } else if (now >= end) {
      ratio = 1;
    } else if (now <= start) {
      ratio = 0;
    } else {
      ratio = (now - start) / Math.max(1, end - start);
    }
    weightedSum += ratio * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
}
