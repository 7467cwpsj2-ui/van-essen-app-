"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { parseInvoicePdf, type InvoiceResult } from "@/lib/actions/invoices";
import { createCostItem } from "@/lib/actions/calc";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export function InvoiceUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const reset = () => {
    setResult(null);
    setError("");
    setSaved(false);
    setSupplier("");
    setAmount("");
    setProjectId("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const parsed = await parseInvoicePdf(formData);
      setResult(parsed);
      if (!parsed.autoFiled) {
        setSupplier(parsed.supplier || "");
        setAmount(parsed.amount != null ? String(parsed.amount) : "");
        setProjectId(parsed.matchedProjectId || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uitlezen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!projectId || !supplier.trim() || !amount) return;
    startTransition(() => {
      createCostItem(projectId, { description: supplier.trim(), amount: Number(amount) || 0 })
        .then(() => setSaved(true))
        .catch((err) => setError(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <div className="panel">
      <div className="hint-bar">
        Sleep een factuur (PDF) hierheen of kies een bestand. Herkent de app de leverancier, het werkadres én het bedrag met genoeg
        zekerheid, dan wordt de kostenpost direct toegevoegd aan de nacalculatie — met een pushmelding ter controle. Lukt dat niet
        volledig, dan vraagt de app je het zelf even aan te vullen.
      </div>

      {!result && !saved && (
        <div className="invoice-drop">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={14} className="spin" /> Factuur wordt gelezen…
              </>
            ) : (
              <>
                <Upload size={14} /> Factuur (PDF) kiezen
              </>
            )}
          </button>
        </div>
      )}

      {error && <div className="login-error">{error}</div>}

      {result?.autoFiled && (
        <div className="add-form">
          <div className="hint-bar small">
            <CheckCircle2 size={13} style={{ display: "inline", marginRight: 5, verticalAlign: -2 }} />
            Automatisch toegevoegd aan de nacalculatie van <b>{result.matchedProjectName}</b>: {result.supplier} —{" "}
            {fmtEuro(result.amount ?? 0)}.
          </div>
          <button className="btn-ghost" onClick={reset} style={{ alignSelf: "flex-start" }}>
            <Upload size={13} /> Nog een factuur uploaden
          </button>
        </div>
      )}

      {result && !result.autoFiled && !saved && (
        <div className="add-form">
          <div className="add-form-title">
            <FileText size={13} style={{ display: "inline", marginRight: 5, verticalAlign: -2 }} />
            Niet zeker genoeg — vul aan en bevestig
          </div>
          <div className="hint-bar small">
            {!result.matchedProjectId && result.workAddress
              ? `Geen project gevonden voor werkadres "${result.workAddress}" — kies er zelf een.`
              : !result.matchedProjectId
                ? "Geen werkadres op de factuur gevonden — kies zelf het juiste project."
                : "Leverancier of bedrag kon niet met zekerheid gelezen worden — controleer hieronder."}
          </div>
          <div className="add-form-grid">
            <label className="field-with-label">
              <span className="field-label">Project</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Kies project</option>
                {result.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-with-label">
              <span className="field-label">Leverancier</span>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Naam leverancier" />
            </label>
            <label className="field-with-label">
              <span className="field-label">Bedrag</span>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>
          <div className="dossier-status-actions">
            <button className="btn-primary" onClick={confirm} disabled={!projectId || !supplier.trim() || !amount}>
              <CheckCircle2 size={14} /> Toevoegen aan nacalculatie
            </button>
            <button className="btn-ghost" onClick={reset}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="add-form">
          <div className="hint-bar small">
            Toegevoegd aan de nacalculatie van {result?.projects.find((p) => p.id === projectId)?.name}: {supplier} —{" "}
            {fmtEuro(Number(amount) || 0)}.
          </div>
          <button className="btn-ghost" onClick={reset} style={{ alignSelf: "flex-start" }}>
            <Upload size={13} /> Nog een factuur uploaden
          </button>
        </div>
      )}
    </div>
  );
}
