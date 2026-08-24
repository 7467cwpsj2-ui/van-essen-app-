"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Download, FileSignature, FileText, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import {
  addSubsidyCheckItem,
  addSubsidyCheckItemPhoto,
  deleteSubsidyCheckItem,
  deleteSubsidyCheckItemPhoto,
  updateSubsidyCheckItem,
} from "@/lib/actions/subsidies";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { Lightbox } from "@/components/Lightbox";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import type { FileType, SubsidyCheckItem, SubsidyProduct } from "@/types/database";

type ItemPhoto = { id: string; url: string | null; fileType: FileType; caption: string | null };

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const todayIso = () => new Date().toISOString().slice(0, 10);

const productLabel = (p: SubsidyProduct) =>
  `${p.measure} — ${p.product_name}${p.manufacturer ? ` (${p.manufacturer})` : ""}${p.meldcode ? ` · ${p.meldcode}` : ""}`;

export function SubsidyCheckPanel({
  projectId,
  projectName,
  isLocked,
  products,
  items,
  photosByItem,
}: {
  projectId: string;
  projectName: string;
  isLocked: boolean;
  products: SubsidyProduct[];
  items: SubsidyCheckItem[];
  photosByItem: Record<string, ItemPhoto[]>;
}) {
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [executionDate, setExecutionDate] = useState(todayIso);
  const [notes, setNotes] = useState("");
  const quantityRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [uploadCounts, setUploadCounts] = useState<Record<string, number>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  // Meerdere foto's/bestanden tegelijk selecteren roept dit per bestand
  // aan (zie FileCaptureButtons) — de teller houdt per maatregel bij
  // hoeveel uploads nog lopen, zodat de knop pas "klaar" toont als echt
  // alles klaar is, ook als de bestanden ongelijk snel verwerken.
  const uploadPhoto = async (itemId: string, file: File) => {
    setUploadCounts((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
    try {
      const processed = await processUploadedFile(file);
      const supabase = createClient();
      const ext = processed.fileName.split(".").pop() || (processed.fileType === "pdf" ? "pdf" : "jpg");
      const path = `${projectId}/subsidie/${itemId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await uploadWithRetry(supabase, path, processed.blob, {
        contentType: processed.fileType === "pdf" ? "application/pdf" : "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await addSubsidyCheckItemPhoto(itemId, projectId, path, processed.fileType, null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setUploadCounts((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) - 1) }));
    }
  };

  const removePhoto = (id: string) => {
    if (!confirm("Deze foto verwijderen?")) return;
    run(() => deleteSubsidyCheckItemPhoto(id, projectId));
  };

  const selectedProduct = products.find((p) => productLabel(p) === search) ?? null;

  const total = items.reduce((s, it) => s + Number(it.indicative_subsidy), 0);

  const pickProduct = (label: string) => {
    setSearch(label);
    if (products.some((p) => productLabel(p) === label)) {
      requestAnimationFrame(() => quantityRef.current?.select());
    }
  };

  const closeAdd = () => {
    setSearch("");
    setQuantity("1");
    setExecutionDate(todayIso());
    setNotes("");
    setShowAdd(false);
  };

  const addItem = () => {
    const q = Number(quantity);
    if (!selectedProduct || !(q > 0)) return;
    run(() => addSubsidyCheckItem(projectId, selectedProduct.id, q, executionDate || null, notes || null));
    closeAdd();
  };

  const startEdit = (it: SubsidyCheckItem) => {
    setEditingId(it.id);
    setEditQuantity(String(it.quantity));
    setEditDate(it.execution_date ?? "");
    setEditNotes(it.notes ?? "");
  };

  const saveEdit = (id: string) => {
    const q = Number(editQuantity);
    if (!(q > 0)) return;
    run(() => updateSubsidyCheckItem(id, projectId, q, editDate || null, editNotes || null));
    setEditingId(null);
  };

  const remove = (id: string) => {
    if (!confirm("Deze regel verwijderen?")) return;
    run(() => deleteSubsidyCheckItem(id, projectId));
  };

  return (
    <div className="panel">
      <div className="hint-bar">
        Bouw hier de subsidiecheck voor dit project op. De meldcodes en bedragen komen uit de meldcodedatabase (Subsidies in het
        menu) — wijzig je die later, dan blijft deze check ongewijzigd staan. Wil je de aanvraag namens de klant indienen? Vraag
        eerst de{" "}
        <Link href={`/projects/${projectId}/machtiging`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <FileSignature size={12} /> machtiging
        </Link>{" "}
        aan.
      </div>

      {!isLocked && (
        <button type="button" className="btn-primary" onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>
          <Plus size={14} /> Maatregel toevoegen
        </button>
      )}

      {items.length === 0 ? (
        <div className="empty-hint">Nog geen maatregelen toegevoegd aan de subsidiecheck.</div>
      ) : (
        <div className="task-list">
          {items.map((it) =>
            editingId === it.id ? (
              <div key={it.id} className="add-form">
                <div className="add-form-grid">
                  <input type="number" min="0" step="0.01" placeholder="Aantal" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                  <input type="date" title="Datum uitvoering" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  <input placeholder="Opmerkingen" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </div>
                <div className="dossier-status-actions">
                  <button className="btn-primary" onClick={() => saveEdit(it.id)}>
                    <Check size={14} /> Opslaan
                  </button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>
                    <X size={14} /> Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div key={it.id} className="task-row">
                <div className="task-body">
                  <div className="task-title">
                    {it.measure} — {it.product_name}
                  </div>
                  <div className="task-meta">
                    {(it.manufacturer || it.type) && <span>{[it.manufacturer, it.type].filter(Boolean).join(" — ")}</span>}
                    {it.meldcode && <span className="mono">Meldcode: {it.meldcode}</span>}
                    <span className="mono">
                      {it.quantity} {it.unit}
                    </span>
                    {it.execution_date && <span>Uitgevoerd: {fmtDate(it.execution_date)}</span>}
                    <span className="mono">{fmtEuro(it.indicative_subsidy)}</span>
                  </div>
                  {it.notes && <div className="task-meta">{it.notes}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                    {(photosByItem[it.id] ?? []).map((ph) =>
                      ph.fileType === "pdf" ? (
                        <div key={ph.id} style={{ position: "relative" }}>
                          {ph.url ? (
                            <a href={ph.url} target="_blank" rel="noreferrer" className="work-attachment-link">
                              <FileText size={13} /> Bijlage
                            </a>
                          ) : (
                            <span className="work-attachment-link">
                              <FileText size={13} /> Bijlage
                            </span>
                          )}
                          {!isLocked && (
                            <button
                              type="button"
                              className="icon-btn danger ghost"
                              style={{ position: "absolute", top: -8, right: -8, background: "var(--panel)" }}
                              title="Foto verwijderen"
                              onClick={() => removePhoto(ph.id)}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div key={ph.id} style={{ position: "relative" }}>
                          <button type="button" className="thumb-btn" onClick={() => ph.url && setLightboxSrc(ph.url)}>
                            {ph.url && <img src={ph.url} alt="" className="work-attachment-thumb" />}
                          </button>
                          {!isLocked && (
                            <button
                              type="button"
                              className="icon-btn danger ghost"
                              style={{ position: "absolute", top: -6, right: -6, background: "var(--panel)" }}
                              title="Foto verwijderen"
                              onClick={() => removePhoto(ph.id)}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      )
                    )}
                    {!isLocked && (
                      <FileCaptureButtons
                        accept="image/*,application/pdf"
                        multiple
                        variant="icon"
                        busy={(uploadCounts[it.id] ?? 0) > 0}
                        onPicked={(file) => uploadPhoto(it.id, file)}
                      />
                    )}
                  </div>
                </div>
                {!isLocked && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="icon-btn ghost" onClick={() => startEdit(it)} title="Bewerken">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn danger ghost" onClick={() => remove(it.id)} title="Verwijderen">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <div className="netto-bar" style={{ marginTop: 12 }}>
        <div className="netto-item netto-total">
          Totale indicatieve subsidie <b>{fmtEuro(total)}</b>
        </div>
      </div>
      <div className="access-summary-sub" style={{ marginTop: 6 }}>
        Dit is een indicatie. De definitieve subsidie wordt vastgesteld door RVO.
      </div>

      {items.length > 0 && (
        <a
          href={`/api/projects/${projectId}/subsidie-pdf`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ marginTop: 12, width: "fit-content" }}
        >
          <Download size={14} /> Subsidiedocument downloaden
        </a>
      )}

      {!isLocked && showAdd && (
        <div className="sig-overlay" onClick={closeAdd}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Maatregel toevoegen aan {projectName}</div>
            <div className="add-form-grid">
              <input
                list="subsidy-product-options"
                placeholder="Typ maatregel, product, fabrikant of meldcode…"
                value={search}
                onChange={(e) => pickProduct(e.target.value)}
                style={{ minWidth: 220 }}
                autoFocus
              />
              <datalist id="subsidy-product-options">
                {products.map((p) => (
                  <option key={p.id} value={productLabel(p)} />
                ))}
              </datalist>
              <input
                ref={quantityRef}
                type="number"
                min="0"
                step="0.01"
                placeholder={selectedProduct ? `Aantal (${selectedProduct.unit})` : "Aantal"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <input type="date" title="Datum uitvoering" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
            </div>
            {selectedProduct && (
              <div className="hint-bar small">
                Meldcode: {selectedProduct.meldcode || "onbekend"} — indicatie: {fmtEuro(selectedProduct.subsidy_amount)} per{" "}
                {selectedProduct.unit}.
              </div>
            )}
            <textarea rows={2} placeholder="Opmerkingen (optioneel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addItem} disabled={!selectedProduct}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
