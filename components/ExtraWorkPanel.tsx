"use client";

import { useState } from "react";
import { FileText, TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { Lightbox } from "@/components/Lightbox";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { approveExtraWork, createExtraWork, deleteExtraWork, rejectExtraWork, resetExtraWork, toggleExtraWorkSchedule } from "@/lib/actions/extraWork";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { VAT_TYPE_LABEL, type ExtraWork, type ExtraWorkStatus, type ExtraWorkType, type ExtraWorkVatType, type Role, type SchedulePhase } from "@/types/database";

const STATUS_LABEL: Record<ExtraWorkStatus, string> = { open: "open", akkoord: "akkoord", afgewezen: "afgewezen" };

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export interface ExtraWorkWithSignature extends ExtraWork {
  signatureUrl: string | null;
  attachmentUrl: string | null;
}

export function ExtraWorkPanel({
  projectId,
  role,
  phases,
  items,
  hideAddForm,
}: {
  projectId: string;
  role: Role;
  phases: SchedulePhase[];
  items: ExtraWorkWithSignature[];
  hideAddForm?: boolean;
}) {
  const [form, setForm] = useState({
    type: "meerwerk" as ExtraWorkType,
    description: "",
    amount: "",
    vatType: "excl" as ExtraWorkVatType,
    extraDays: "",
    phaseId: "",
    explanation: "",
  });
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useRealtimeRefresh("extra_work", projectId);

  const handlePicked = async (file: File) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setPending(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    if (!form.description.trim() || !form.amount) return;
    const days = Number(form.extraDays) || 0;
    if (days > 0 && !form.phaseId) {
      alert("Kies bij welke fase deze dagen horen, anders wordt de bouwplanning niet aangepast.");
      return;
    }
    setBusy(true);
    try {
      let filePath: string | null = null;
      let fileType: "image" | "pdf" | null = null;
      if (pending) {
        const supabase = createClient();
        const ext = pending.fileName.split(".").pop() || (pending.fileType === "pdf" ? "pdf" : "jpg");
        const path = `${projectId}/extra-work/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(path, pending.blob, {
          contentType: pending.fileType === "pdf" ? "application/pdf" : "image/jpeg",
        });
        if (uploadError) throw new Error(uploadError.message);
        filePath = path;
        fileType = pending.fileType;
      }
      await createExtraWork(projectId, {
        type: form.type,
        description: form.description,
        amount: Number(form.amount),
        vatType: form.vatType,
        explanation: form.explanation || null,
        filePath,
        fileType,
        extraDays: days || null,
        phaseId: days > 0 ? form.phaseId : null,
      });
      setForm({ type: "meerwerk", description: "", amount: "", vatType: "excl", extraDays: "", phaseId: "", explanation: "" });
      setPending(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleOwnerStatusChange = async (id: string, status: ExtraWorkStatus) => {
    setBusy(true);
    try {
      if (status === "akkoord") await approveExtraWork(projectId, id, null);
      else if (status === "afgewezen") await rejectExtraWork(projectId, id);
      else await resetExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bijwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSchedule = async (id: string, apply: boolean) => {
    setBusy(true);
    try {
      await toggleExtraWorkSchedule(projectId, id, apply);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bijwerken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleClientApprove = async (id: string, signatureBlob: Blob) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${projectId}/signatures/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, signatureBlob, {
        contentType: "image/png",
      });
      if (uploadError) throw new Error(uploadError.message);
      await approveExtraWork(projectId, id, path);
      setSigningId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Akkoord geven mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const handleClientReject = async (id: string) => {
    setBusy(true);
    try {
      await rejectExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Afwijzen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm("Dit item verwijderen?")) return;
    setBusy(true);
    try {
      await deleteExtraWork(projectId, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwijderen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  // Excl.- en incl.-btw bedragen bij elkaar optellen zou een bedrag
  // opleveren dat niet meer klopt (appels en peren), dus per btw-soort
  // een eigen totaal — en als een project maar één soort gebruikt (het
  // gebruikelijke geval), verschijnt de andere sectie simpelweg niet.
  const sumAkkoord = (type: ExtraWorkType, vatType: ExtraWorkVatType) =>
    items.filter((w) => w.type === type && w.status === "akkoord" && w.vat_type === vatType).reduce((s, w) => s + Number(w.amount), 0);
  const vatSections: { vatType: ExtraWorkVatType; meerwerk: number; minderwerk: number }[] = (["excl", "incl"] as const)
    .map((vatType) => ({ vatType, meerwerk: sumAkkoord("meerwerk", vatType), minderwerk: sumAkkoord("minderwerk", vatType) }))
    .filter(({ vatType }) => items.some((w) => w.status === "akkoord" && w.vat_type === vatType));

  return (
    <div className="panel">
      {signingId && (
        <SignaturePad
          title="Onderteken om akkoord te bevestigen"
          onCancel={() => setSigningId(null)}
          onSave={(blob) => handleClientApprove(signingId, blob)}
        />
      )}
      <Lightbox src={sigPreview} onClose={() => setSigPreview(null)} />
      {vatSections.length === 0 ? (
        <div className="netto-bar">
          <div className="netto-item">
            <TrendingUp size={14} /> Meerwerk (akkoord) <b>{fmtEuro(0)}</b>
          </div>
          <div className="netto-item">
            <TrendingDown size={14} /> Minderwerk (akkoord) <b>{fmtEuro(0)}</b>
          </div>
          <div className="netto-item netto-total">
            Netto bij te betalen <b>{fmtEuro(0)}</b>
          </div>
        </div>
      ) : (
        vatSections.map(({ vatType, meerwerk, minderwerk }) => (
          <div key={vatType} className="netto-bar">
            <div className="netto-item">
              <TrendingUp size={14} /> Meerwerk (akkoord, {VAT_TYPE_LABEL[vatType]}) <b>{fmtEuro(meerwerk)}</b>
            </div>
            <div className="netto-item">
              <TrendingDown size={14} /> Minderwerk (akkoord, {VAT_TYPE_LABEL[vatType]}) <b>{fmtEuro(minderwerk)}</b>
            </div>
            <div className="netto-item netto-total">
              Netto bij te betalen ({VAT_TYPE_LABEL[vatType]}) <b>{fmtEuro(meerwerk - minderwerk)}</b>
            </div>
          </div>
        ))
      )}
      {role === "klant" && (
        <div className="hint-bar">
          Zodra je een keuze maakt (akkoord of afwijzen), staat dit vast — alleen Van Essen Bouw &amp; Onderhoud kan het daarna nog
          aanpassen.
        </div>
      )}
      {items.length === 0 && <div className="empty-hint">Nog geen meer- of minderwerk geregistreerd.</div>}
      <div className="work-list">
        {items.map((w) => {
          const phase = w.phase_id ? phases.find((ph) => ph.id === w.phase_id) : null;
          return (
            <div key={w.id} className={"work-row work-" + w.type}>
              <div className="work-type-icon">{w.type === "meerwerk" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</div>
              <div className="work-body">
                <div className="work-desc">{w.description}</div>
                <div className="work-sub mono">
                  {w.type === "meerwerk" ? "+" : "−"} {fmtEuro(Number(w.amount))}{" "}
                  <span className="vat-pill">{VAT_TYPE_LABEL[w.vat_type]}</span>
                </div>
                {!!w.extra_days && (
                  <div className="work-sub">
                    {w.extra_days > 0
                      ? `+${w.extra_days} werk${w.extra_days === 1 ? "dag" : "dagen"} extra`
                      : `${Math.abs(w.extra_days)} werk${Math.abs(w.extra_days) === 1 ? "dag" : "dagen"} korter`}
                    {phase ? ` bij ${phase.title}` : ""} —{" "}
                    {w.schedule_applied ? "bouwplanning aangepast" : "bouwplanning past pas aan na akkoord van de klant"}
                    {role === "eigenaar" && (
                      <button
                        type="button"
                        className="link-btn"
                        disabled={busy}
                        style={{ marginLeft: 8 }}
                        onClick={() => handleToggleSchedule(w.id, !w.schedule_applied)}
                      >
                        {w.schedule_applied ? "ongedaan maken in bouwplanning" : "opnieuw toepassen in bouwplanning"}
                      </button>
                    )}
                  </div>
                )}
                {w.status === "akkoord" && w.approved_by && (
                  <div className="work-sub sig-line">
                    Akkoord door {w.approved_by} op {w.approved_date}
                    {w.signatureUrl && (
                      <button type="button" className="sig-thumb-btn" onClick={() => setSigPreview(w.signatureUrl)} title="Handtekening bekijken">
                        <img src={w.signatureUrl} alt="Handtekening" className="sig-thumb" />
                      </button>
                    )}
                  </div>
                )}
                {w.status === "afgewezen" && w.rejected_by && (
                  <div className="work-sub">
                    Afgewezen door {w.rejected_by} op {w.rejected_date}
                  </div>
                )}
                {w.explanation && <div className="work-explanation">{w.explanation}</div>}
                {w.attachmentUrl &&
                  (w.file_type === "pdf" ? (
                    <a href={w.attachmentUrl} target="_blank" rel="noreferrer" className="work-attachment-link">
                      <FileText size={13} /> Bijlage openen
                    </a>
                  ) : (
                    <button type="button" className="thumb-btn" onClick={() => setSigPreview(w.attachmentUrl)}>
                      <img src={w.attachmentUrl} alt="" className="work-attachment-thumb" />
                    </button>
                  ))}
              </div>
              {role === "eigenaar" ? (
                <select
                  className="status-select"
                  value={w.status}
                  disabled={busy}
                  onChange={(e) => handleOwnerStatusChange(w.id, e.target.value as ExtraWorkStatus)}
                >
                  <option value="open">Open</option>
                  <option value="akkoord">Akkoord</option>
                  <option value="afgewezen">Afgewezen</option>
                </select>
              ) : role === "klant" && w.status === "open" ? (
                <div className="choice-btns">
                  <button className="btn-primary" disabled={busy} onClick={() => setSigningId(w.id)}>
                    Akkoord
                  </button>
                  <button className="btn-ghost" disabled={busy} onClick={() => handleClientReject(w.id)}>
                    Afwijzen
                  </button>
                </div>
              ) : (
                <span className={"stamp stamp-" + w.status}>{STATUS_LABEL[w.status]}</span>
              )}
              {role === "eigenaar" && (
                <button className="icon-btn danger ghost" onClick={() => removeItem(w.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {role !== "klant" && !hideAddForm && (
        <div className="add-form">
          <div className="add-form-title">Meer- of minderwerk toevoegen</div>
          <div className="add-form-grid">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExtraWorkType })}>
              <option value="meerwerk">Meerwerk</option>
              <option value="minderwerk">Minderwerk</option>
            </select>
            <input placeholder="Omschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" placeholder="Bedrag €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select value={form.vatType} onChange={(e) => setForm({ ...form, vatType: e.target.value as ExtraWorkVatType })}>
              <option value="excl">Excl. btw</option>
              <option value="incl">Incl. btw</option>
            </select>
            <label className="field-with-label">
              <span className="field-label">Uitgebreide beschrijving (optioneel — klant kan dit inzien)</span>
              <textarea
                rows={3}
                placeholder="Leg hier uit wat er precies gebeurt en waarom, zodat de klant het goed kan beoordelen…"
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              />
            </label>
            {phases.length > 0 && (
              <>
                <input
                  type="number"
                  min="0"
                  placeholder={form.type === "meerwerk" ? "Extra werkdagen (optioneel)" : "Werkdagen korter (optioneel)"}
                  value={form.extraDays}
                  onChange={(e) => setForm({ ...form, extraDays: e.target.value })}
                />
                {Number(form.extraDays) > 0 && (
                  <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}>
                    <option value="">Bij welke fase?</option>
                    {phases.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.title}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            <button className="btn-primary" onClick={addItem} disabled={busy}>
              Toevoegen
            </button>
          </div>
          <div className="field-with-label">
            <span className="field-label">Foto of bestand (optioneel — klant kan dit inzien)</span>
            <FileCaptureButtons accept="image/*,application/pdf" onPicked={handlePicked} busy={busy} />
            <FilePreview
              previewUrl={pending?.previewUrl ?? null}
              fileType={pending?.fileType ?? null}
              fileName={pending?.fileName ?? null}
              onClear={() => setPending(null)}
            />
          </div>
          {phases.length > 0 && Number(form.extraDays) > 0 && (
            <div className="hint-bar small">
              Zodra de klant akkoord geeft, wordt de gekozen fase met {form.extraDays} werkdagen {form.type === "meerwerk" ? "verlengd" : "verkort"}{" "}
              (weekenden tellen niet mee) en schuiven latere fases automatisch mee. Wijst de klant af, dan verandert er niets aan de
              planning.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
