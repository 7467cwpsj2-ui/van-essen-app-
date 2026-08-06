import type { SchedulePhase, Task } from "@/types/database";

const DAY_MS = 86400000;

// Voortgang van een project in procenten, per fase gewogen naar rato
// van de duur van die fase (langere fases wegen zwaarder). Elke fase
// telt zowel het afvinken van gekoppelde taken als het verstrijken van
// de tijd binnen de bouwplanning-periode mee (gemiddelde van beide) —
// zo blijft de voortgangsbalk meelopen met de planning, ook als er nog
// niemand een taak heeft afgevinkt, én blijft afgevinkt werk zichtbaar
// als een fase nog maar net begonnen is. Zonder bouwplanning telt
// gewoon het aandeel afgevinkte taken.
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

    let dateRatio: number;
    if (now >= end) dateRatio = 1;
    else if (now <= start) dateRatio = 0;
    else dateRatio = (now - start) / Math.max(1, end - start);

    const ratio = linked.length ? (linked.filter((t) => t.done).length / linked.length + dateRatio) / 2 : dateRatio;

    weightedSum += ratio * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
}
