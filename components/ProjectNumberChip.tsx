"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatProjectNumber, formatProjectNumberPlain } from "@/lib/projectNumber";

export function ProjectNumberChip({ year, sequence }: { year: number | null; sequence: number | null }) {
  const [copied, setCopied] = useState(false);
  if (year == null || sequence == null) return null;
  const number = formatProjectNumber(year, sequence);

  // Kopieert zonder streepjes — leveranciers typen die er in de
  // praktijk toch niet bij, en zonder streepjes blijft het nummer nog
  // steeds correct te herleiden (zie lib/projectNumber.ts).
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatProjectNumberPlain(year, sequence));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard kan weigeren (geen HTTPS-context, geen focus) — dan
      // negeren we het gewoon, het nummer blijft gewoon leesbaar.
    }
  };

  return (
    <span className="project-number-chip mono">
      #{number}
      <button type="button" onClick={copy} title="Kopieer projectnummer">
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}
