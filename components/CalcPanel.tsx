"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createCostItem, deleteCostItem, updateCalc } from "@/lib/actions/calc";
import { InvoiceUploadPanel } from "@/components/InvoiceUploadPanel";
import { VAT_TYPE_LABEL, type CostItem, type ExtraWorkVatType, type Project } from "@/types/database";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

interface LaborRow {
  name: string;
  hours: number;
  rate: number | null;
  vatType: ExtraWorkVatType | null;
  amount: number;
}

export function CalcPanel({
  projectId,
  project,
  meerwerkAkkoord,
  minderwerkAkkoord,
  labor,
  costItems,
  isLocked,
}: {
  projectId: string;
  project: Project;
  meerwerkAkkoord: number;
  minderwerkAkkoord: number;
  labor: LaborRow[];
  costItems: CostItem[];
  isLocked: boolean;
}) {
  const [quoteAmount, setQuoteAmount] = useState(String(project.quote_amount ?? 0));
  const [quoteVatType, setQuoteVatType] = useState<ExtraWorkVatType>(project.quote_vat_type ?? "excl");
  const [itemDescription, setItemDescription] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemVatType, setItemVatType] = useState<ExtraWorkVatType>("excl");
  const [itemSupplier, setItemSupplier] = useState("");
  const [itemInvoiceNumber, setItemInvoiceNumber] = useState("");
  const [, startTransition] = useTransition();

  const begroot = Number(project.quote_amount) || 0;
  const aangepasteBegroting = begroot + meerwerkAkkoord - minderwerkAkkoord;
  const arbeidskosten = labor.reduce((s, l) => s + l.amount, 0);
  const overigeKosten = costItems.reduce((s, c) => s + Number(c.amount), 0);
  const werkelijk = arbeidskosten + overigeKosten;
  const marge = aangepasteBegroting - werkelijk;
  const missingRate = labor.some((l) => l.rate == null && l.hours > 0);

  const saveQuote = () => {
    startTransition(() => {
      updateCalc(projectId, { quoteAmount: Number(quoteAmount) || 0, quoteVatType }).catch((err) =>
        alert(err instanceof Error ? err.message : "Opslaan mislukt.")
      );
    });
  };

  const addItem = () => {
    if (!itemDescription.trim() || !itemAmount) return;
    startTransition(() => {
      createCostItem(projectId, {
        description: itemDescription,
        amount: Number(itemAmount) || 0,
        vatType: itemVatType,
        supplier: itemSupplier,
        invoiceNumber: itemInvoiceNumber,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setItemDescription("");
    setItemAmount("");
    setItemSupplier("");
    setItemInvoiceNumber("");
  };

  const costBySupplier = costItems.reduce<Map<string, number>>((map, c) => {
    const key = c.supplier?.trim() || "Overig";
    map.set(key, (map.get(key) ?? 0) + Number(c.amount));
    return map;
  }, new Map());
  const supplierTotals = Array.from(costBySupplier.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="panel">
      <div className="hint-bar">Nacalculatie is alleen voor jou zichtbaar — team en klant zien dit nooit.</div>

      <div className="calc-grid">
        <label className="calc-field">
          Begroot (offertebedrag)
          <input type="number" value={quoteAmount} disabled={isLocked} onChange={(e) => setQuoteAmount(e.target.value)} />
        </label>
        <label className="calc-field">
          Btw
          <select value={quoteVatType} disabled={isLocked} onChange={(e) => setQuoteVatType(e.target.value as ExtraWorkVatType)}>
            <option value="excl">{VAT_TYPE_LABEL.excl}</option>
            <option value="incl">{VAT_TYPE_LABEL.incl}</option>
          </select>
        </label>
      </div>
      {!isLocked && (
        <button className="btn-primary" onClick={saveQuote} style={{ alignSelf: "flex-start" }}>
          Opslaan
        </button>
      )}

      <div className="calc-summary">
        <div className="calc-line">
          <span>
            Begroot <span className="vat-pill">{VAT_TYPE_LABEL[quoteVatType]}</span>
          </span>
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
          <span>
            Arbeidskosten (uren × tarief) <span className="vat-pill">{VAT_TYPE_LABEL.excl}</span>
          </span>
          <span className="mono">{fmtEuro(arbeidskosten)}</span>
        </div>
        <div className="calc-line">
          <span>Overige kosten</span>
          <span className="mono">{fmtEuro(overigeKosten)}</span>
        </div>
        <div className="calc-line calc-line-strong">
          <span>Werkelijk</span>
          <span className="mono">{fmtEuro(werkelijk)}</span>
        </div>
        <div className={"calc-line calc-line-marge " + (marge >= 0 ? "pos" : "neg")}>
          <span>Marge</span>
          <span className="mono">{fmtEuro(marge)}</span>
        </div>
      </div>

      <div className="add-form-title" style={{ marginTop: 4 }}>
        Arbeidskosten — uit geregistreerde uren
      </div>
      {labor.length === 0 ? (
        <div className="empty-hint small">Nog geen uren geregistreerd op dit project.</div>
      ) : (
        <div className="task-list">
          {labor.map((l) => (
            <div key={l.name} className="task-row">
              <div className="task-body">
                <div className="task-title">{l.name}</div>
                <div className="task-meta">
                  <span>
                    {l.hours} uur{l.rate != null ? ` × ${fmtEuro(l.rate)}` : ""}
                    {l.rate != null && l.vatType && <span className="vat-pill">{VAT_TYPE_LABEL[l.vatType]}</span>}
                  </span>
                  <span className="mono">{l.rate != null ? `${fmtEuro(l.amount)} excl. btw` : "geen tarief ingesteld"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {missingRate && (
        <div className="hint-bar small">
          Sommige uren tellen nog niet mee, omdat er geen uurtarief is ingesteld — dat kun je toevoegen bij het teamlid op de
          Personeel-pagina.
        </div>
      )}
      {labor.some((l) => l.vatType === "incl") && (
        <div className="hint-bar small">
          Uurtarieven die incl. btw zijn ingevuld, worden hier automatisch omgerekend naar excl. btw (21%) voor de arbeidskosten.
        </div>
      )}

      <div className="add-form-title" style={{ marginTop: 4 }}>
        Overige kosten
      </div>
      {costItems.length === 0 && <div className="empty-hint small">Nog geen overige kostenposten toegevoegd.</div>}
      <div className="task-list">
        {costItems.map((c) => (
          <div key={c.id} className="task-row">
            <div className="task-body">
              <div className="task-title">{c.description}</div>
              <div className="task-meta">
                <span>
                  {c.supplier && <>{c.supplier}</>}
                  {c.invoice_number && <> · factuur {c.invoice_number}</>}
                </span>
                <span className="mono">{fmtEuro(c.amount)}</span>
                <span className="vat-pill">{VAT_TYPE_LABEL[c.vat_type]}</span>
              </div>
            </div>
            {!isLocked && (
              <button
                className="icon-btn danger ghost"
                onClick={() => startTransition(() => deleteCostItem(projectId, c.id).catch(() => {}))}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {supplierTotals.length > 0 && (
        <>
          <div className="add-form-title" style={{ marginTop: 4 }}>
            Kosten per leverancier
          </div>
          <div className="task-list">
            {supplierTotals.map(([supplier, total]) => (
              <div key={supplier} className="task-row">
                <div className="task-body">
                  <div className="task-title">{supplier}</div>
                </div>
                <span className="mono">{fmtEuro(total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!isLocked && (
        <>
          <InvoiceUploadPanel projectId={projectId} projectName={project.name} />
          <div className="add-form">
            <div className="add-form-title">Handmatig een kostenpost toevoegen</div>
            <div className="add-form-grid">
              <input
                placeholder="Omschrijving (bv. Materiaal bij leverancier X)"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Bedrag"
                value={itemAmount}
                onChange={(e) => setItemAmount(e.target.value)}
              />
              <select value={itemVatType} onChange={(e) => setItemVatType(e.target.value as ExtraWorkVatType)}>
                <option value="excl">{VAT_TYPE_LABEL.excl}</option>
                <option value="incl">{VAT_TYPE_LABEL.incl}</option>
              </select>
              <input placeholder="Leverancier (optioneel)" value={itemSupplier} onChange={(e) => setItemSupplier(e.target.value)} />
              <input
                placeholder="Factuurnummer (optioneel)"
                value={itemInvoiceNumber}
                onChange={(e) => setItemInvoiceNumber(e.target.value)}
              />
              <button className="btn-primary" onClick={addItem}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
