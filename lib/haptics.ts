"use client";

// Korte trilling bij een tik — werkt alleen op toestellen/browsers die de
// Vibration API ondersteunen (Android Chrome wel, iOS Safari niet; daar
// doet dit gewoon stil niets, precies zoals bedoeld). Nooit een fout
// gooien, dit is puur decoratieve feedback.
export function haptic(intensity: "light" | "medium" = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(intensity === "light" ? 8 : 16);
  } catch {
    // negeren
  }
}
