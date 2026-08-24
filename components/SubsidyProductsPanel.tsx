"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createSubsidyProduct,
  deleteSubsidyProduct,
  toggleSubsidyProductActive,
  updateSubsidyProduct,
  type SubsidyProductInput,
} from "@/lib/actions/subsidies";
import type { SubsidyProduct } from "@/types/database";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const EMPTY_FORM: SubsidyProductInput = {
  category: "",
  measure: "",
  manufacturer: "",
  productName: "",
  type: "",
  meldcode: "",
  unit: "stuk",
  subsidyAmount: 0,
  validFrom: "",
  validTo: "",
  notes: "",
};

function toInput(p: SubsidyProduct): SubsidyProductInput {
  return {
    category: p.category,
    measure: p.measure,
    manufacturer: p.manufacturer ?? "",
    productName: p.product_name,
    type: p.type ?? "",
    meldcode: p.meldcode ?? "",
    unit: p.unit,
    subsidyAmount: Number(p.subsidy_amount),
    validFrom: p.valid_from ?? "",
    validTo: p.valid_to ?? "",
    notes: p.notes ?? "",
  };
}

function ProductFields({ form, setForm }: { form: SubsidyProductInput; setForm: (f: SubsidyProductInput) => void }) {
  return (
    <>
      <div className="add-form-grid">
        <input placeholder="Categorie (bv. Isolatie)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input placeholder="Maatregel (bv. Dakisolatie)" value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} />
        <input placeholder="Fabrikant" value={form.manufacturer ?? ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
        <input placeholder="Productnaam" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
        <input placeholder="Type" value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <input placeholder="RVO-meldcode" value={form.meldcode ?? ""} onChange={(e) => setForm({ ...form, meldcode: e.target.value })} />
        <input placeholder="Eenheid (m², stuk, kW…)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <input
          type="number"
          step="0.01"
          placeholder="Subsidiebedrag per eenheid €"
          value={form.subsidyAmount || ""}
          onChange={(e) => setForm({ ...form, subsidyAmount: Number(e.target.value) })}
        />
        <input type="date" title="Geldig vanaf" value={form.validFrom ?? ""} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
        <input type="date" title="Geldig tot" value={form.validTo ?? ""} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
      </div>
      <textarea
        rows={2}
        placeholder="Opmerkingen / technische voorwaarden (optioneel)"
        value={form.notes ?? ""}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />
    </>
  );
}

export function SubsidyProductsPanel({ products }: { products: SubsidyProduct[] }) {
  const [form, setForm] = useState<SubsidyProductInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubsidyProductInput>(EMPTY_FORM);
  const [showInactive, setShowInactive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  const visible = showInactive ? products : products.filter((p) => p.active);
  const byCategory = new Map<string, SubsidyProduct[]>();
  visible.forEach((p) => {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  });

  const closeAdd = () => {
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const addProduct = () => {
    if (!form.category.trim() || !form.measure.trim() || !form.productName.trim()) return;
    run(() => createSubsidyProduct(form));
    closeAdd();
  };

  const startEdit = (p: SubsidyProduct) => {
    setEditingId(p.id);
    setEditForm(toInput(p));
  };

  const saveEdit = (id: string) => {
    if (!editForm.category.trim() || !editForm.measure.trim() || !editForm.productName.trim()) return;
    run(() => updateSubsidyProduct(id, editForm));
    setEditingId(null);
  };

  const remove = (id: string) => {
    if (!confirm("Dit product verwijderen? Al gemaakte subsidiechecks blijven ongewijzigd, die zijn een momentopname.")) return;
    run(() => deleteSubsidyProduct(id));
  };

  return (
    <div className="panel">
      <div className="hint-bar">
        Deze meldcodedatabase bepaalt welke producten en RVO-meldcodes medewerkers kunnen kiezen bij de subsidiecheck op een project.
        Pas bedragen en meldcodes hier aan zodra de regeling wijzigt — een al gemaakte subsidiecheck op een bestaand project verandert
        daardoor niet met terugwerkende kracht mee.
      </div>

      <div className="mode-toggle">
        <button type="button" className={!showInactive ? "active" : ""} onClick={() => setShowInactive(false)}>
          Actief
        </button>
        <button type="button" className={showInactive ? "active" : ""} onClick={() => setShowInactive(true)}>
          Alles
        </button>
      </div>

      <button type="button" className="btn-primary" onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> Product / meldcode toevoegen
      </button>

      {visible.length === 0 ? (
        <div className="empty-hint">Nog geen producten toegevoegd.</div>
      ) : (
        Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category} className="access-block">
            <div className="access-block-title">{category}</div>
            <div className="task-list">
              {items.map((p) =>
                editingId === p.id ? (
                  <div key={p.id} className="add-form">
                    <ProductFields form={editForm} setForm={setEditForm} />
                    <div className="dossier-status-actions">
                      <button className="btn-primary" onClick={() => saveEdit(p.id)}>
                        <Check size={14} /> Opslaan
                      </button>
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>
                        <X size={14} /> Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="task-row">
                    <div className="task-body">
                      <div className="task-title">
                        {p.measure} — {p.product_name}
                        {!p.active && <span className="stamp stamp-afgewezen">inactief</span>}
                      </div>
                      <div className="task-meta">
                        {p.manufacturer && <span>{p.manufacturer}</span>}
                        {p.type && <span>{p.type}</span>}
                        {p.meldcode && <span className="mono">Meldcode: {p.meldcode}</span>}
                        <span className="mono">
                          {fmtEuro(p.subsidy_amount)} / {p.unit}
                        </span>
                        {(p.valid_from || p.valid_to) && (
                          <span>
                            Geldig {p.valid_from || "…"} – {p.valid_to || "…"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="btn-ghost" onClick={() => run(() => toggleSubsidyProductActive(p.id, !p.active))}>
                        {p.active ? "Deactiveren" : "Activeren"}
                      </button>
                      <button className="icon-btn ghost" onClick={() => startEdit(p)} title="Bewerken">
                        <Pencil size={14} />
                      </button>
                      <button className="icon-btn danger ghost" onClick={() => remove(p.id)} title="Verwijderen">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <div className="sig-overlay" onClick={closeAdd}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Nieuw product / meldcode toevoegen</div>
            <ProductFields form={form} setForm={setForm} />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addProduct}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
