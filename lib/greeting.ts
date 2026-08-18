// Tijdsbewuste begroeting op basis van de Nederlandse klok, ongeacht in
// welke tijdzone de server zelf draait.
export function timeAwareGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(new Date())
  );
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}
