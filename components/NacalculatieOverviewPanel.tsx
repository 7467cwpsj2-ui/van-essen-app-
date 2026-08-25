"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { createCostItem, deleteCostItem, updateCostItem, updateQuickJobPrice } from "@/lib/actions/calc";
import { InvoiceUploadPanel } from "@/components/InvoiceUploadPanel";
import { VAT_TYPE_LABEL, type CostItem, type ExtraWorkVatType } from "@/types/database";
import type { NacalculatieRow } from "@/lib/nacalculatie";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

type Filter = "alle" | "lopend" | "afgerond";

function MargeAmount({ row }: { row: NacalculatieRow }) {
  if (!row.hasPrice) {
    return <span className="stamp stamp-open">Nog geen prijs</span>;
  }
  return (
    <span className="mono" style={{ color: row.marge >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 700 }}>
      {fmtEuro(row.marge)}
    </span>
  );
}

export function NacalculatieOverviewPanel({ rows }: { rows: NacalculatieRow[] }) {
  const [filter, setFilter] = useState<Filter>("alle");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => rows.filter((r) => filter === "alle" || (filter === "lopend" ? r.isOpen : !r.isOpen)),
    [rows, filter]
  );

  const totals = filtered.reduce(
    (acc, r) => ({ begroot: acc.begroot + r.begroot, werkelijk: acc.werkelijk + r.werkelijk, marge: acc.marge + r.marge }),
    { begroot: 0, werkelijk: 0, marge: 0 }
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="panel">
      <div className="hint-bar">Nacalculatie is alleen voor jou zichtbaar — team en klant zien dit nooit.</div>

      <div className="mode-toggle">
        {(["alle", "lopend", "afgerond"] as Filter[]).map((f) => (
          <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f === "alle" ? "Alles" : f === "lopend" ? "Lopend" : "Afgerond"}
          </button>
        ))}
      </div>

      <div className="calc-summary">
        <div className="calc-line">
          <span>Begroot</span>
          <span className="mono">{fmtEuro(totals.begroot)}</span>
        </div>
        <div className="calc-line">
          <span>Werkelijk</span>
          <span className="mono">{fmtEuro(totals.werkelijk)}</span>
        </div>
        <div className={"calc-line calc-line-marge " + (totals.marge >= 0 ? "pos" : "neg")}>
          <span>Totale marge</span>
          <span className="mono">{fmtEuro(totals.marge)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint small">Niets te zien in deze weergave.</div>
      ) : (
        <div className="access-list">
          {filtered.map((r) =>
            r.kind === "project" ? (
              <Link key={r.id} href={r.href!} className="access-item hours-row">
                <span className="access-summary" style={{ display: "flex" }}>
                  <span className="access-summary-main">
                    <span className="access-summary-name">{r.name}</span>
                    <span className="access-summary-sub">Project · {r.statusLabel}</span>
                  </span>
                  <MargeAmount row={r} />
                  <ChevronRight size={14} className="access-chevron" />
                </span>
              </Link>
            ) : (
              <div key={r.id} className={"access-item hours-row" + (expanded.has(r.id) ? " expanded" : "")}>
                <button type="button" className="access-summary" onClick={() => toggle(r.id)}>
                  <span className="access-summary-main">
                    <span className="access-summary-name">{r.name}</span>
                    <span className="access-summary-sub">Losse klus · {r.statusLabel}</span>
                  </span>
                  <MargeAmount row={r} />
                  <ChevronDown size={14} className={"access-chevron" + (expanded.has(r.id) ? " open" : "")} />
                </button>
                {expanded.has(r.id) && (
                  <div className="access-details">
                    <QuickJobCalcInline row={r} />
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function QuickJobCalcInline({ row }: { row: NacalculatieRow }) {
  const [price, setPrice] = useState(String(row.begroot || ""));
  const [vatType, setVatType] = useState<ExtraWorkVatType>(row.vatType);
  const [showAddCost, setShowAddCost] = useState(false);
  const [itemDescription, setItemDescription] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemVatType, setItemVatType] = useState<ExtraWorkVatType>("excl");
  const [itemSupplier, setItemSupplier] = useState("");
  const [itemInvoiceNumber, setItemInvoiceNumber] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", vatType: "excl" as ExtraWorkVatType, supplier: "", invoiceNumber: "" });
  const [, startTransition] = useTransition();

  const target = { quickJobId: row.id } as const;
  const missingRate = row.labor.some((l) => l.rate == null);

  const savePrice = () => {
    startTransition(() => {
      updateQuickJobPrice(row.id, { price: Number(price) || 0, priceVatType: vatType }).catch((err) =>
        alert(err instanceof Error ? err.message : "Opslaan mislukt.")
      );
    });
  };

  const closeAddCost = () => {
    setItemDescription("");
    setItemAmount("");
    setItemSupplier("");
    setItemInvoiceNumber("");
    setShowAddCost(false);
  };

  const addItem = () => {
    const description = itemDescription.trim() || itemSupplier.trim();
    if (!description || !itemAmount) {
      alert("Vul in elk geval een omschrijving (of leverancier) en een bedrag in.");
      return;
    }
    startTransition(() => {
      createCostItem(target, {
        description,
        amount: Number(itemAmount) || 0,
        vatType: itemVatType,
        supplier: itemSupplier,
        invoiceNumber: itemInvoiceNumber,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    closeAddCost();
  };

  const startEdit = (c: CostItem) => {
    setEditingId(c.id);
    setEditForm({ description: c.description, amount: String(c.amount), vatType: c.vat_type, supplier: c.supplier ?? "", invoiceNumber: c.invoice_number ?? "" });
  };

  const saveEdit = (id: string) => {
    const description = editForm.description.trim() || editForm.supplier.trim();
    if (!description || !editForm.amount) {
      alert("Vul in elk geval een omschrijving (of leverancier) en een bedrag in.");
      return;
    }
    startTransition(() => {
      updateCostItem(target, id, {
        description,
        amount: Number(editForm.amount) || 0,
        vatType: editForm.vatType,
        supplier: editForm.supplier,
        invoiceNumber: editForm.invoiceNumber,
      }).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
    setEditingId(null);
  };

  return (
    <>
      <div className="add-form-grid">
        <label className="field-with-label">
          <span className="field-label">Prijs (afgesproken/gefactureerd)</span>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field-with-label">
          <span className="field-label">Btw</span>
          <select value={vatType} onChange={(e) => setVatType(e.target.value as ExtraWorkVatType)}>
            <option value="excl">{VAT_TYPE_LABEL.excl}</option>
            <option value="incl">{VAT_TYPE_LABEL.incl}</option>
          </select>
        </label>
      </div>
      <button className="btn-primary" onClick={savePrice} style={{ alignSelf: "flex-start" }}>
        Opslaan
      </button>

      <div className="calc-summary">
        <div className="calc-line">
          <span>
            Arbeidskosten (uren × tarief) <span className="vat-pill">{VAT_TYPE_LABEL.excl}</span>
          </span>
          <span className="mono">{fmtEuro(row.labor.reduce((s, l) => s + l.amount, 0))}</span>
        </div>
        <div className="calc-line">
          <span>Overige kosten</span>
          <span className="mono">{fmtEuro(row.costItems.reduce((s, c) => s + Number(c.amount), 0))}</span>
        </div>
        <div className="calc-line calc-line-strong">
          <span>Werkelijk</span>
          <span className="mono">{fmtEuro(row.werkelijk)}</span>
        </div>
        <div className={"calc-line calc-line-marge " + (row.marge >= 0 ? "pos" : "neg")}>
          <span>Marge</span>
          <span className="mono">{fmtEuro(row.marge)}</span>
        </div>
      </div>

      {row.labor.length > 0 && (
        <>
          <div className="add-form-title" style={{ marginTop: 4 }}>
            Arbeidskosten — uit geregistreerde uren
          </div>
          <div className="task-list">
            {row.labor.map((l) => (
              <div key={l.memberId} className="task-row">
                <div className="task-body">
                  <div className="task-title">{l.name}</div>
                  <div className="task-meta">
                    <span>
                      {l.hours} uur{l.rate != null ? ` × ${fmtEuro(l.rate)}` : ""}
                    </span>
                    <span className="mono">{l.rate != null ? `${fmtEuro(l.amount)} excl. btw` : "geen tarief ingesteld"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {missingRate && (
        <div className="hint-bar small">
          Sommige uren tellen nog niet mee, omdat er geen uurtarief is ingesteld — dat kun je toevoegen bij het teamlid op de
          Personeel-pagina.
        </div>
      )}

      <div className="add-form-title" style={{ marginTop: 4 }}>
        Overige kosten
      </div>
      <button type="button" className="btn-primary" onClick={() => setShowAddCost(true)} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> Kostenpost toevoegen
      </button>
      {row.costItems.length === 0 && <div className="empty-hint small">Nog geen overige kostenposten toegevoegd.</div>}
      <div className="task-list">
        {row.costItems.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="add-form">
              <div className="add-form-grid">
                <input placeholder="Omschrijving" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Bedrag"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
                <select value={editForm.vatType} onChange={(e) => setEditForm({ ...editForm, vatType: e.target.value as ExtraWorkVatType })}>
                  <option value="excl">{VAT_TYPE_LABEL.excl}</option>
                  <option value="incl">{VAT_TYPE_LABEL.incl}</option>
                </select>
                <input
                  placeholder="Leverancier (optioneel)"
                  value={editForm.supplier}
                  onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                />
                <input
                  placeholder="Factuurnummer (optioneel)"
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                />
                <div className="dossier-status-actions">
                  <button className="btn-primary" onClick={() => saveEdit(c.id)}>
                    <Check size={14} /> Opslaan
                  </button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
              <div style={{ display: "flex", gap: 4 }}>
                <button className="icon-btn ghost" onClick={() => startEdit(c)} title="Bewerken">
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-btn danger ghost"
                  title="Verwijderen"
                  onClick={() => startTransition(() => deleteCostItem(target, c.id).catch(() => {}))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <InvoiceUploadPanel target={target} targetName={row.name} />

      {showAddCost && (
        <div className="sig-overlay" onClick={closeAddCost}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Kostenpost toevoegen</div>
            <div className="add-form-grid">
              <input
                placeholder="Omschrijving (bv. Materiaal bij leverancier X)"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
              <input type="number" min="0" step="0.01" placeholder="Bedrag" value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} />
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
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAddCost}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addItem}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
