"use client";

import { useState, useTransition } from "react";
import { updateCalc } from "@/lib/actions/calc";
import type { Project } from "@/types/database";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export function CalcPanel({
  projectId,
  project,
  meerwerkAkkoord,
  minderwerkAkkoord,
  isLocked,
}: {
  projectId: string;
  project: Project;
  meerwerkAkkoord: number;
  minderwerkAkkoord: number;
  isLocked: boolean;
}) {
  const [quoteAmount, setQuoteAmount] = useState(String(project.quote_amount ?? 0));
  const [actualCost, setActualCost] = useState(String(project.actual_cost ?? 0));
  const [, startTransition] = useTransition();

  const begroot = Number(project.quote_amount) || 0;
  const werkelijk = Number(project.actual_cost) || 0;
  const aangepasteBegroting = begroot + meerwerkAkkoord - minderwerkAkkoord;
  const marge = aangepasteBegroting - werkelijk;

  const save = () => {
    startTransition(() => {
      updateCalc(projectId, { quoteAmount: Number(quoteAmount) || 0, actualCost: Number(actualCost) || 0 }).catch((err) =>
        alert(err instanceof Error ? err.message : "Opslaan mislukt.")
      );
    });
  };

  return (
    <div className="panel">
      <div className="hint-bar">Nacalculatie is alleen voor jou zichtbaar — team en klant zien dit nooit.</div>
      <div className="calc-grid">
        <label className="calc-field">
          Begroot (offertebedrag)
          <input type="number" value={quoteAmount} disabled={isLocked} onChange={(e) => setQuoteAmount(e.target.value)} />
        </label>
        <label className="calc-field">
          Werkelijk (gemaakte kosten)
          <input type="number" value={actualCost} disabled={isLocked} onChange={(e) => setActualCost(e.target.value)} />
        </label>
      </div>
      {!isLocked && (
        <button className="btn-primary" onClick={save} style={{ alignSelf: "flex-start" }}>
          Opslaan
        </button>
      )}

      <div className="calc-summary">
        <div className="calc-line">
          <span>Begroot</span>
          <span className="mono">{fmtEuro(begroot)}</span>
        </div>
        <div className="calc-line">
          <span>+ Meerwerk (akkoord)</span>
          <span className="mono">{fmtEuro(meerwerkAkkoord)}</span>
        </div>
        <div className="calc-line">
          <span>− Minderwerk (akkoord)</span>
          <span className="mono">{fmtEuro(minderwerkAkkoord)}</span>
        </div>
        <div className="calc-line calc-line-strong">
          <span>Aangepaste begroting</span>
          <span className="mono">{fmtEuro(aangepasteBegroting)}</span>
        </div>
        <div className="calc-line">
          <span>Werkelijk</span>
          <span className="mono">{fmtEuro(werkelijk)}</span>
        </div>
        <div className={"calc-line calc-line-marge " + (marge >= 0 ? "pos" : "neg")}>
          <span>Marge</span>
          <span className="mono">{fmtEuro(marge)}</span>
        </div>
      </div>
    </div>
  );
}
