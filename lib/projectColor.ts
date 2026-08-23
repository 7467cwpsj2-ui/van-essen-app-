// Eén kleur per project, overal consistent — dezelfde herleiding als de
// kleurbolletjes in de algemene planning, zodat een project altijd
// dezelfde kleur draagt, of dat nu in de planning is of op een
// projectkaart zonder omslagfoto.
export const PROJECT_COLORS = [
  "#2f6fed",
  "#dd6b20",
  "#38a169",
  "#d53f8c",
  "#805ad5",
  "#319795",
  "#c05621",
  "#3182ce",
  "#b7791f",
  "#4c51bf",
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash;
}

export function colorForProject(projectId: string): string {
  return PROJECT_COLORS[hashString(projectId) % PROJECT_COLORS.length];
}

// Zelfde herleiding, maar voor willekeurige tekst — gebruikt om bijv.
// bouwplanning-fases een eigen kleur per aannemer/uitvoerder te geven
// binnen één project, zonder dat daar een apart kleurveld voor nodig is.
export function colorForKey(key: string): string {
  return PROJECT_COLORS[hashString(key) % PROJECT_COLORS.length];
}

// Twee tinten voor een zachte kleurverloop-tegel — gebruikt de expliciete
// planning-kleur van het project als startpunt zodra die is ingesteld,
// anders volledig herleid uit het project-id.
export function gradientForProject(projectId: string, planningColor?: string | null): [string, string] {
  const hash = hashString(projectId);
  const from = planningColor || PROJECT_COLORS[hash % PROJECT_COLORS.length];
  const to = PROJECT_COLORS[(hash >> 4) % PROJECT_COLORS.length];
  return from === to ? [from, PROJECT_COLORS[(hash + 1) % PROJECT_COLORS.length]] : [from, to];
}

export function initialsForProject(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
