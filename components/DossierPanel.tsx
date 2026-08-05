"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, Plus, Printer, Trash2 } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { Lightbox } from "@/components/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { createWarrantyItem, deleteWarrantyItem, signDelivery, updateDossierSettings } from "@/lib/actions/dossier";
import type { CompletionPoint, Project, Role, WarrantyItem, WarrantyUnit } from "@/types/database";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export function DossierPanel({
  projectId,
  role,
  project,
  completionPoints,
  meerwerkAkkoord,
  minderwerkAkkoord,
  warrantyItems,
  deliveryPhotos,
  signatureUrl,
}: {
  projectId: string;
  role: Role;
  project: Project;
  completionPoints: CompletionPoint[];
  meerwerkAkkoord: number;
  minderwerkAkkoord: number;
  warrantyItems: WarrantyItem[];
  deliveryPhotos: { id: string; title: string; signedUrl: string | null }[];
  signatureUrl: string | null;
}) {
  const isLocked = !!project.delivery_signed_at;
  const [deliveryDate, setDeliveryDate] = useState(project.delivery_date || "");
  const [warrantyText, setWarrantyText] = useState(project.warranty_text || "");
  const [deliveryReady, setDeliveryReady] = useState(project.delivery_ready);
  const [warrantyForm, setWarrantyForm] = useState({ item: "", amount: "", unit: "jaren" as WarrantyUnit });
  const [signing, setSigning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const eindtotaal = Number(project.quote_amount || 0) + meerwerkAkkoord - minderwerkAkkoord;
  const allApproved = completionPoints.length > 0 && completionPoints.every((p) => p.status === "goedgekeurd");

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
      createWarrantyItem(projectId, warrantyForm.item, Number(warrantyForm.amount), warrantyForm.unit).catch((err) =>
        alert(err instanceof Error ? err.message : "Toevoegen mislukt.")
      );
    });
    setWarrantyForm({ item: "", amount: "", unit: "jaren" });
  };

  const handleSign = async (blob: Blob) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${projectId}/delivery/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, blob, { contentType: "image/png" });
      if (uploadError) throw new Error(uploadError.message);
      await signDelivery(projectId, path);
      setSigning(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ondertekenen mislukt.");
    } finally {
      setBusy(false);
    }
  };

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
        <button type="button" className="btn-ghost no-print" style={{ marginLeft: "auto" }} onClick={() => window.print()}>
          <Printer size={13} /> Printen / PDF
        </button>
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

      <div className="calc-summary">
        <div className="calc-line">
          <span>Offertebedrag</span>
          <span className="mono">{fmtEuro(project.quote_amount)}</span>
        </div>
        <div className="calc-line">
          <span>Meerwerk (akkoord)</span>
          <span className="mono">{fmtEuro(meerwerkAkkoord)}</span>
        </div>
        <div className="calc-line">
          <span>Minderwerk (akkoord)</span>
          <span className="mono">− {fmtEuro(minderwerkAkkoord)}</span>
        </div>
        <div className="calc-line calc-line-strong">
          <span>Eindtotaal</span>
          <span className="mono">{fmtEuro(eindtotaal)}</span>
        </div>
      </div>

      {project.delivery_date && (
        <div className="hint-bar small">Opleverdatum: {project.delivery_date}</div>
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

      {deliveryPhotos.length > 0 && (
        <div>
          <div className="dash-section-title">Opleverfoto&apos;s</div>
          <div className="drawing-grid">
            {deliveryPhotos.map((ph) => (
              <div key={ph.id} className="drawing-card">
                {ph.signedUrl && (
                  <button type="button" className="thumb-btn" onClick={() => setPreview(ph.signedUrl)}>
                    <img src={ph.signedUrl} alt="" className="drawing-thumb" />
                  </button>
                )}
                <div className="drawing-body">
                  <div className="drawing-title">{ph.title}</div>
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
          {warrantyItems.map((w) => (
            <div key={w.id} className="warranty-row">
              {w.item}
              <b>
                {w.amount} {w.unit}
              </b>
              {role === "eigenaar" && !isLocked && (
                <button
                  className="icon-btn danger ghost no-print"
                  onClick={() => startTransition(() => deleteWarrantyItem(projectId, w.id).catch((err) => alert(err.message)))}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {role === "eigenaar" && !isLocked && (
          <div className="add-form no-print" style={{ marginTop: 8 }}>
            <div className="add-form-grid">
              <input placeholder="Onderdeel (bv. Dakbedekking)" value={warrantyForm.item} onChange={(e) => setWarrantyForm({ ...warrantyForm, item: e.target.value })} />
              <input type="number" placeholder="Aantal" value={warrantyForm.amount} onChange={(e) => setWarrantyForm({ ...warrantyForm, amount: e.target.value })} />
              <select value={warrantyForm.unit} onChange={(e) => setWarrantyForm({ ...warrantyForm, unit: e.target.value as WarrantyUnit })}>
                <option value="weken">weken</option>
                <option value="maanden">maanden</option>
                <option value="jaren">jaren</option>
              </select>
              <button className="btn-primary" onClick={addWarranty}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
}
