"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatProjectNumber } from "@/lib/projectNumber";

export function ProjectNumberChip({ year, sequence }: { year: number | null; sequence: number | null }) {
  const [copied, setCopied] = useState(false);
  if (year == null || sequence == null) return null;
  const number = formatProjectNumber(year, sequence);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
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
