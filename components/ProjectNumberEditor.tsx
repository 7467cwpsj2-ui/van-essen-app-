"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatProjectNumber } from "@/lib/projectNumber";

// Herbruikbaar formulier om het projectnummer te corrigeren en de
// externe offerte-/factuurnummers (uit de eigen facturatietool) vast te
// leggen — gebruikt zowel bij projecten als bij losse klussen.
export function ProjectNumberEditor({
  sequence,
  offerNumber,
  invoiceNumbers,
  onSaveNumber,
  onSaveRefs,
}: {
  sequence: number | null;
  offerNumber: string | null;
  invoiceNumbers: string[];
  onSaveNumber: (sequence: number) => Promise<void>;
  onSaveRefs: (data: { offerNumber: string | null; invoiceNumbers: string[] }) => Promise<void>;
}) {
  const [numberInput, setNumberInput] = useState(sequence != null ? String(sequence) : "");
  const [offer, setOffer] = useState(offerNumber || "");
  const [invoices, setInvoices] = useState<string[]>(invoiceNumbers.length ? invoiceNumbers : [""]);
  const [pending, startTransition] = useTransition();

  const saveNumber = () => {
    const parsed = Number(numberInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      alert("Vul een geldig nummer in.");
      return;
    }
    startTransition(() => {
      onSaveNumber(parsed).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  const saveRefs = () => {
    startTransition(() => {
      onSaveRefs({ offerNumber: offer || null, invoiceNumbers: invoices.filter((n) => n.trim()) }).catch((err) =>
        alert(err instanceof Error ? err.message : "Opslaan mislukt.")
      );
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field-with-label">
        <span className="field-label">Projectnummer</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="access-name-input"
            style={{ maxWidth: 90 }}
            inputMode="numeric"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value.replace(/\D/g, ""))}
          />
          <span className="access-summary-sub mono">
            wordt getoond als #{numberInput ? formatProjectNumber(Number(numberInput)) : "…"}
          </span>
          <button type="button" className="btn-ghost" onClick={saveNumber} disabled={pending}>
            Opslaan
          </button>
        </div>
      </div>

      <div className="field-with-label">
        <span className="field-label">Offertenummer</span>
        <input className="access-name-input" placeholder="bijv. 2026-0081-1" value={offer} onChange={(e) => setOffer(e.target.value)} />
      </div>

      <div className="field-with-label">
        <span className="field-label">Factuurnummers</span>
        {invoices.map((value, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <input
              className="access-name-input"
              placeholder="bijv. 20260035"
              value={value}
              onChange={(e) => setInvoices(invoices.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <button
              type="button"
              className="icon-btn ghost"
              onClick={() => setInvoices(invoices.length > 1 ? invoices.filter((_, j) => j !== i) : [""])}
              title="Verwijderen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost" style={{ width: "fit-content" }} onClick={() => setInvoices([...invoices, ""])}>
          <Plus size={13} /> Factuurnummer toevoegen
        </button>
      </div>

      <button type="button" className="btn-primary" style={{ width: "fit-content" }} onClick={saveRefs} disabled={pending}>
        {pending ? "Bezig…" : "Offerte/factuurnummers opslaan"}
      </button>
    </div>
  );
}
