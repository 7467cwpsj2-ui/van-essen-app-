"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Copy, Download, FileText, Link2, Lock, Plus, Printer, Trash2, X } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { Lightbox } from "@/components/Lightbox";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import {
  createWarrantyItem,
  deleteWarrantyItem,
  getOrCreateDossierShareLink,
  removeWarrantyCertificate,
  revokeDossierShareLink,
  setWarrantyCertificate,
  signDelivery,
  updateDossierSettings,
} from "@/lib/actions/dossier";
import { warrantyEndDate } from "@/lib/warranty";
import { computeDossierFinancials } from "@/lib/dossierFinancials";
import type { DossierWarrantyItem } from "@/lib/dossierData";
import { VAT_TYPE_LABEL, WARRANTY_TYPE_LABEL } from "@/types/database";
import type { ClientChoice, CompletionPoint, ExtraWork, PhotoCategory, Project, Role, WarrantyType, WarrantyUnit } from "@/types/database";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

const PHOTO_STORY_LABEL: Record<Exclude<PhotoCategory, "oplevering">, string> = {
  voor: "Voor de start",
  tijdens: "Tijdens de werkzaamheden",
  na: "Na afronding",
};

// Geen wettelijk vastgelegde garantietermijnen per vakgebied — die
// bestaan niet in de Nederlandse wet — maar gebruikelijke branchetermijnen
// (o.a. via garantieregelingen als BouwGarant) als startpunt. Altijd
// aan te passen vóór het toevoegen.
const WARRANTY_PRESETS: { item: string; amount: number; unit: WarrantyUnit }[] = [
  { item: "Tegelwerk", amount: 5, unit: "jaren" },
  { item: "Sanitair (aansluiting)", amount: 1, unit: "jaren" },
  { item: "Leidingwerk / elektra", amount: 2, unit: "jaren" },
  { item: "Timmerwerk", amount: 2, unit: "jaren" },
  { item: "Stucwerk", amount: 2, unit: "jaren" },
  { item: "Schilderwerk", amount: 1, unit: "jaren" },
  { item: "Metsel-/steenwerk (lekkages)", amount: 6, unit: "jaren" },
];

interface DossierPhoto {
  id: string;
  title: string;
  url: string | null;
}

interface DossierDrawing {
  id: string;
  title: string;
  url: string | null;
  fileType: string | null;
}

export function DossierPanel({
  projectId,
  role,
  project,
  completionPoints,
  extraWork,
  warrantyItems,
  photosByCategory,
  clientChoices,
  drawings,
  signatureUrl,
  reviewQrDataUrl,
  shareUrl: initialShareUrl,
  companyName,
}: {
  projectId: string;
  role: Role;
  project: Project;
  completionPoints: CompletionPoint[];
  extraWork: ExtraWork[];
  warrantyItems: DossierWarrantyItem[];
  photosByCategory: Record<PhotoCategory, DossierPhoto[]>;
  clientChoices: ClientChoice[];
  drawings: DossierDrawing[];
  signatureUrl: string | null;
  reviewQrDataUrl: string | null;
  shareUrl: string | null;
  companyName: string;
}) {
  const isLocked = !!project.delivery_signed_at;
  const [deliveryDate, setDeliveryDate] = useState(project.delivery_date || "");
  const [warrantyText, setWarrantyText] = useState(project.warranty_text || "");
  const [deliveryReady, setDeliveryReady] = useState(project.delivery_ready);
  const [warrantyForm, setWarrantyForm] = useState({
    item: "",
    amount: "",
    unit: "jaren" as WarrantyUnit,
    warrantyType: "eigen" as WarrantyType,
    manufacturer: "",
    startDate: "",
  });
  const [signing, setSigning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [certificateUploadingId, setCertificateUploadingId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const financials = computeDossierFinancials(project, extraWork);
  const allApproved = completionPoints.length > 0 && completionPoints.every((p) => p.status === "goedgekeurd");
  const warrantyBase = project.delivery_signed_at || project.delivery_date;

  const statusClass = isLocked ? "signed" : project.delivery_ready ? "ready" : "pending";
  const statusLabel = isLocked ? "Ondertekend" : project.delivery_ready ? "Klaar voor oplevering" : "Open";

  const saveSettings = () => {
    startTransition(() => {
      updateDossierSettings(projectId, {
        deliveryDate: deliveryDate || null,
        warrantyText: warrantyText || null,
        deliveryReady,
      }).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  const addWarranty = () => {
    if (!warrantyForm.item.trim() || !Number(warrantyForm.amount)) return;
    startTransition(() => {
      createWarrantyItem(
        projectId,
        warrantyForm.item,
        Number(warrantyForm.amount),
        warrantyForm.unit,
        warrantyForm.warrantyType,
        warrantyForm.manufacturer || null,
        warrantyForm.startDate || null
      ).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setWarrantyForm({ item: "", amount: "", unit: "jaren", warrantyType: "eigen", manufacturer: "", startDate: "" });
  };

  const uploadCertificate = async (id: string, file: File) => {
    setCertificateUploadingId(id);
    try {
      const processed = await processUploadedFile(file);
      const supabase = createClient();
      const ext = processed.fileName.split(".").pop() || (processed.fileType === "pdf" ? "pdf" : "jpg");
      const path = `${projectId}/warranty/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await uploadWithRetry(supabase, path, processed.blob, {
        contentType: processed.fileType === "pdf" ? "application/pdf" : "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await setWarrantyCertificate(id, projectId, path, processed.fileType);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setCertificateUploadingId(null);
    }
  };

  const removeCertificate = (id: string) => {
    startTransition(() => {
      removeWarrantyCertificate(id, projectId).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  const handleSign = async (blob: Blob) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${projectId}/delivery/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await uploadWithRetry(supabase, path, blob, { contentType: "image/png" });
      if (uploadError) throw new Error(uploadError.message);
      await signDelivery(projectId, path);
      setSigning(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ondertekenen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const generateShareLink = async () => {
    setShareBusy(true);
    try {
      const url = await getOrCreateDossierShareLink(projectId);
      setShareUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Aanmaken mislukt.");
    } finally {
      setShareBusy(false);
    }
  };

  const revokeShareLink = async () => {
    setShareBusy(true);
    try {
      await revokeDossierShareLink(projectId);
      setShareUrl(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Intrekken mislukt.");
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // negeren — clipboard-toegang kan geweigerd zijn, link staat gewoon zichtbaar
    }
  };

  const photoSection = (title: string, photos: DossierPhoto[]) =>
    photos.length > 0 && (
      <div key={title}>
        <div className="dash-section-title">{title}</div>
        <div className="drawing-grid">
          {photos.map((ph) => (
            <div key={ph.id} className="drawing-card">
              {ph.url && (
                <button type="button" className="thumb-btn" onClick={() => setPreview(ph.url)}>
                  <img src={ph.url} alt="" className="drawing-thumb" />
                </button>
              )}
              <div className="drawing-body">
                <div className="drawing-title">{ph.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="panel">
      {signing && (
        <SignaturePad
          title="Onderteken om de oplevering af te sluiten"
          onCancel={() => setSigning(false)}
          onSave={handleSign}
        />
      )}
      <Lightbox src={preview} onClose={() => setPreview(null)} />

      <div className={"dossier-status " + statusClass}>
        {isLocked ? <Lock size={16} /> : <CheckCircle2 size={16} />}
        {statusLabel}
        <div className="dossier-status-actions no-print">
          <a href={`/api/projects/${projectId}/dossier-pdf`} target="_blank" rel="noreferrer" className="btn-primary">
            <Download size={13} /> Download PDF
          </a>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            <Printer size={13} /> Printen
          </button>
        </div>
      </div>
      <div className="access-summary-sub no-print" style={{ marginTop: -8, marginBottom: 4 }}>
        Dit dossier voldoet aan het wettelijk verplichte consumentendossier (art. 7:757a BW).
      </div>

      {!isLocked && !allApproved && completionPoints.length > 0 && (
        <div className="hint-bar small">Nog niet alle opleverpunten zijn goedgekeurd door de klant.</div>
      )}

      {role === "eigenaar" && !isLocked && (
        <div className="add-form no-print">
          <div className="add-form-title">Opleverdossier instellen</div>
          <div className="hint-bar small">Het offertebedrag stel je in bij Nacalculatie — dat bedrag wordt hier automatisch meegenomen.</div>
          <div className="calc-grid">
            <label className="calc-field">
              Opleverdatum
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </label>
          </div>
          <label className="calc-field">
            Garantietekst
            <textarea rows={2} value={warrantyText} onChange={(e) => setWarrantyText(e.target.value)} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={deliveryReady} onChange={(e) => setDeliveryReady(e.target.checked)} />
            Klaar voor oplevering (zichtbaar als status voor de klant)
          </label>
          <button className="btn-primary" onClick={saveSettings} style={{ alignSelf: "flex-start" }}>
            Opslaan
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {financials.map((f) => (
          <div className="calc-summary" key={f.vatType}>
            {f.isQuoteVatType && (
              <div className="calc-line">
                <span>Offertebedrag ({VAT_TYPE_LABEL[f.vatType]})</span>
                <span className="mono">{fmtEuro(f.quoteAmount)}</span>
              </div>
            )}
            {f.meerwerk > 0 && (
              <div className="calc-line">
                <span>Meerwerk (akkoord, {VAT_TYPE_LABEL[f.vatType]})</span>
                <span className="mono">{fmtEuro(f.meerwerk)}</span>
              </div>
            )}
            {f.minderwerk > 0 && (
              <div className="calc-line">
                <span>Minderwerk (akkoord, {VAT_TYPE_LABEL[f.vatType]})</span>
                <span className="mono">− {fmtEuro(f.minderwerk)}</span>
              </div>
            )}
            <div className="calc-line calc-line-strong">
              <span>Eindtotaal ({VAT_TYPE_LABEL[f.vatType]})</span>
              <span className="mono">{fmtEuro(f.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {project.delivery_date && (
        <div className="hint-bar small">Opleverdatum: {project.delivery_date}</div>
      )}

      {extraWork.length > 0 && (
        <div>
          <div className="dash-section-title">Meer- en minderwerk</div>
          <div className="work-list">
            {extraWork.map((w) => (
              <div key={w.id} className="list-row">
                <div className="list-row-body">
                  <div className="list-row-title">{w.description}</div>
                  {w.approved_date && <div className="list-row-sub">Akkoord op {fmtDate(w.approved_date)}</div>}
                </div>
                <span className="mono">
                  {w.type === "minderwerk" ? "− " : ""}
                  {fmtEuro(w.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {completionPoints.length > 0 && (
        <div>
          <div className="dash-section-title">Opleverpunten</div>
          <div className="work-list">
            {completionPoints.map((p) => (
              <div key={p.id} className="list-row">
                <div className="list-row-body">
                  <div className="list-row-title">{p.description}</div>
                </div>
                <span className={"stamp " + (p.status === "goedgekeurd" ? "stamp-akkoord" : "stamp-open")}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {clientChoices.length > 0 && (
        <div>
          <div className="dash-section-title">Klantkeuzes</div>
          <div className="work-list">
            {clientChoices.map((c) => (
              <div key={c.id} className="list-row">
                <div className="list-row-body">
                  <div className="list-row-title">{c.category}</div>
                  {c.description && <div className="list-row-sub">{c.description}</div>}
                </div>
                <span className="mono">{c.choice_text || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(["voor", "tijdens", "na"] as const).map((cat) => photoSection(PHOTO_STORY_LABEL[cat], photosByCategory[cat]))}
      {photoSection("Opleverfoto's", photosByCategory.oplevering)}

      {drawings.length > 0 && (
        <div>
          <div className="dash-section-title">Tekeningen</div>
          <div className="drawing-grid">
            {drawings.map((d) => (
              <div key={d.id} className="drawing-card">
                {d.fileType === "pdf" ? (
                  d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="thumb-btn drawing-pdf-link" title="Tekening openen">
                      <div className="drawing-icon">
                        <FileText size={20} />
                      </div>
                    </a>
                  ) : (
                    <div className="drawing-icon">
                      <FileText size={20} />
                    </div>
                  )
                ) : d.url ? (
                  <button type="button" className="thumb-btn" onClick={() => setPreview(d.url)} title="Tekening bekijken">
                    <img src={d.url} alt="" className="drawing-thumb" />
                  </button>
                ) : null}
                <div className="drawing-body">
                  <div className="drawing-title">{d.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="dash-section-title">Garantie</div>
        {project.warranty_text && <div className="hint-bar small">{project.warranty_text}</div>}
        <div className="warranty-list">
          {warrantyItems.length === 0 && <div className="empty-hint">Nog geen garantie-items.</div>}
          {warrantyItems.map((w) => {
            const base = w.start_date || warrantyBase;
            const end = base ? warrantyEndDate(base, w.amount, w.unit) : null;
            return (
              <div key={w.id} className="warranty-row" style={{ flexWrap: "wrap" }}>
                <div>
                  {w.item}
                  <span className={"stamp " + (w.warranty_type === "fabrikant" ? "stamp-open" : "stamp-akkoord")} style={{ marginLeft: 8 }}>
                    {WARRANTY_TYPE_LABEL[w.warranty_type]}
                  </span>
                  {w.manufacturer && <div className="access-summary-sub">{w.manufacturer}</div>}
                </div>
                <span style={{ marginLeft: "auto", textAlign: "right" }}>
                  <b style={{ marginLeft: 0 }}>
                    {w.amount} {w.unit}
                  </b>
                  {end && (
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-faint)" }}>tot {fmtDate(end)}</span>
                  )}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {w.certificateUrl ? (
                    <div style={{ position: "relative" }}>
                      {w.certificate_file_type === "pdf" ? (
                        <a href={w.certificateUrl} target="_blank" rel="noreferrer" className="work-attachment-link">
                          <FileText size={13} /> Certificaat
                        </a>
                      ) : (
                        <button type="button" className="thumb-btn" onClick={() => setPreview(w.certificateUrl)}>
                          <img src={w.certificateUrl} alt="" className="sig-thumb" />
                        </button>
                      )}
                      {role === "eigenaar" && !isLocked && (
                        <button
                          type="button"
                          className="icon-btn danger ghost no-print"
                          style={{ position: "absolute", top: -8, right: -8, background: "var(--panel)" }}
                          onClick={() => removeCertificate(w.id)}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ) : (
                    role === "eigenaar" &&
                    !isLocked && (
                      <FileCaptureButtons
                        accept="image/*,application/pdf"
                        variant="icon"
                        busy={certificateUploadingId === w.id}
                        onPicked={(file) => uploadCertificate(w.id, file)}
                      />
                    )
                  )}
                  {role === "eigenaar" && !isLocked && (
                    <button
                      className="icon-btn danger ghost no-print"
                      onClick={() => startTransition(() => deleteWarrantyItem(projectId, w.id).catch((err) => alert(err.message)))}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {role === "eigenaar" && !isLocked && (
          <div className="add-form no-print" style={{ marginTop: 8 }}>
            <div className="access-summary-sub">Snelkeuze (gebruikelijke branchetermijn, altijd aan te passen):</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {WARRANTY_PRESETS.map((preset) => (
                <button
                  key={preset.item}
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() =>
                    setWarrantyForm({ ...warrantyForm, item: preset.item, amount: String(preset.amount), unit: preset.unit })
                  }
                >
                  {preset.item} ({preset.amount} {preset.unit})
                </button>
              ))}
            </div>
            <div className="add-form-grid">
              <input
                placeholder="Onderdeel (bv. Warmtepomp)"
                value={warrantyForm.item}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, item: e.target.value })}
              />
              <select
                value={warrantyForm.warrantyType}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyType: e.target.value as WarrantyType })}
              >
                <option value="eigen">Eigen garantie (Van Essen)</option>
                <option value="fabrikant">Fabrieksgarantie</option>
              </select>
              <input
                placeholder="Fabrikant (optioneel)"
                value={warrantyForm.manufacturer}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, manufacturer: e.target.value })}
              />
              <input type="number" placeholder="Aantal" value={warrantyForm.amount} onChange={(e) => setWarrantyForm({ ...warrantyForm, amount: e.target.value })} />
              <select value={warrantyForm.unit} onChange={(e) => setWarrantyForm({ ...warrantyForm, unit: e.target.value as WarrantyUnit })}>
                <option value="weken">weken</option>
                <option value="maanden">maanden</option>
                <option value="jaren">jaren</option>
              </select>
              <input
                type="date"
                title="Ingangsdatum (optioneel — anders geldt de opleverdatum)"
                value={warrantyForm.startDate}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, startDate: e.target.value })}
              />
              <button className="btn-primary" onClick={addWarranty}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
            <div className="hint-bar small">
              Bij fabrieksgarantie (bv. warmtepomp, cv-ketel, sanitair) kun je een eigen ingangsdatum invullen als die afwijkt van de
              opleverdatum, en achteraf een garantiecertificaat toevoegen.
            </div>
          </div>
        )}
        <div className="hint-bar small" style={{ marginTop: 8 }}>
          Op grond van artikel 7:758 lid 4 BW blijft {companyName} aansprakelijk voor gebreken die bij oplevering niet zijn
          ontdekt, tenzij het gebrek niet aan {companyName} kan worden toegerekend — dit geldt naast bovenstaande
          garantietermijnen en kan niet in uw nadeel worden uitgesloten.
        </div>
      </div>

      {isLocked ? (
        <div className="hint-bar">
          <Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Ondertekend door {project.delivery_signed_by} op {project.delivery_signed_at && new Date(project.delivery_signed_at).toLocaleDateString("nl-NL")}.
          {signatureUrl && (
            <div style={{ marginTop: 8 }}>
              <img src={signatureUrl} alt="Handtekening" style={{ height: 40, background: "#fff", borderRadius: 4, padding: 4 }} />
            </div>
          )}
        </div>
      ) : (
        (role === "eigenaar" || role === "klant") && (
          <div className="add-form no-print">
            <div className="add-form-title">Oplevering afsluiten</div>
            <div className="hint-bar small">
              Onderteken om het project af te sluiten. Dit zet de status op &ldquo;Afgerond&rdquo; en vergrendelt het dossier permanent — niemand
              kan daarna nog iets wijzigen.
            </div>
            <button className="btn-primary" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => setSigning(true)}>
              Onderteken om af te sluiten
            </button>
          </div>
        )
      )}

      {reviewQrDataUrl && (
        <div className="hint-bar">
          <img src={reviewQrDataUrl} alt="QR-code review" style={{ width: 64, height: 64, verticalAlign: "middle", marginRight: 10 }} />
          Bedankt voor het vertrouwen! Scan de QR-code om een review achter te laten.
        </div>
      )}

      {role === "eigenaar" && (
        <div className="add-form no-print">
          <div className="add-form-title">Deelbare link</div>
          <div className="hint-bar small">
            Deel dit dossier met de klant via een linkje — geen account nodig. Let op: de link toont dezelfde gegevens als de PDF
            (ook het financiële overzicht), deel hem dus alleen met de klant zelf.
          </div>
          {shareUrl ? (
            <>
              <div className="calc-field">
                <input value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
              </div>
              <div className="dossier-status-actions">
                <button className="btn-ghost" onClick={copyShareLink}>
                  <Copy size={13} /> {copied ? "Gekopieerd!" : "Kopieer link"}
                </button>
                <button className="btn-ghost" disabled={shareBusy} onClick={revokeShareLink}>
                  <Trash2 size={13} /> Link intrekken
                </button>
              </div>
            </>
          ) : (
            <button className="btn-primary" disabled={shareBusy} onClick={generateShareLink} style={{ alignSelf: "flex-start" }}>
              <Link2 size={14} /> Genereer deelbare link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
