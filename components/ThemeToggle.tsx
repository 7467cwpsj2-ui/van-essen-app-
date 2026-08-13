"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

type Pref = "system" | "light" | "dark";

const ORDER: Pref[] = ["system", "light", "dark"];
const LABEL: Record<Pref, string> = { system: "Systeem (automatisch)", light: "Licht", dark: "Donker" };
const ICON: Record<Pref, typeof Sun> = { system: SunMoon, light: Sun, dark: Moon };

function applyTheme(pref: Pref) {
  if (pref === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    document.documentElement.setAttribute("data-theme", pref);
    localStorage.setItem("theme", pref);
  }
}

export function ThemeToggle() {
  const [pref, setPref] = useState<Pref | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setPref(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  if (pref === null) return <span className="icon-btn ghost" style={{ visibility: "hidden" }} />;

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    applyTheme(next);
  };

  const Icon = ICON[pref];

  return (
    <button type="button" className="icon-btn ghost" onClick={cycle} title={`Thema: ${LABEL[pref]} — tik om te wisselen`}>
      <Icon size={14} />
    </button>
  );
}
