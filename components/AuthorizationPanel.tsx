"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Download, FileText, Upload, X } from "lucide-react";
import { FileCaptureButtons } from "@/components/FileCaptureButtons";
import { FilePreview } from "@/components/FilePreview";
import { cancelSubsidyAuthorization, requestSubsidyAuthorization, uploadAuthorizationForm } from "@/lib/actions/subsidies";
import { processUploadedFile } from "@/lib/fileProcessing";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import type { Role, SubsidyAuthorization } from "@/types/database";

const RVO_FORM_URL = "https://www.rvo.nl/sites/default/files/2022-10/Machtigingsformulier-ISDE-woningeigenaren.pdf";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export function AuthorizationPanel({
  projectId,
  role,
  authorization,
  formFileUrl,
}: {
  projectId: string;
  role: Role;
  authorization: SubsidyAuthorization | null;
  formFileUrl: string | null;
}) {
  const [pending, setPending] = useState<{ blob: Blob; fileType: "image" | "pdf"; fileName: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    try {
      await requestSubsidyAuthorization(projectId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!authorization) return;
    if (!confirm("Deze aanvraag intrekken?")) return;
    setBusy(true);
    try {
      await cancelSubsidyAuthorization(authorization.id, projectId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  };

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

  const confirmUpload = async () => {
    if (!pending || !authorization) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = pending.fileName.split(".").pop() || (pending.fileType === "pdf" ? "pdf" : "jpg");
      const path = `${projectId}/machtiging/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await uploadWithRetry(supabase, path, pending.blob, {
        contentType: pending.fileType === "pdf" ? "application/pdf" : "image/jpeg",
      });
      if (uploadError) throw new Error(uploadError.message);
      await uploadAuthorizationForm(authorization.id, projectId, path, pending.fileType);
      setPending(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Uploaden mislukt.");
    } finally {
      setBusy(false);
    }
  };

  if (role !== "klant") {
    return (
      <div className="panel">
        <div className="hint-bar">
          Hiermee vraag je de klant om het officiële RVO-machtigingsformulier te downloaden, in te vullen en te ondertekenen, en het
          daarna hier als foto of scan terug te uploaden. Bewaar dat bestand in je eigen administratie — RVO kan er later om vragen.
        </div>

        {!authorization && (
          <button className="btn-primary" onClick={request} disabled={busy} style={{ width: "fit-content" }}>
            <FileText size={14} /> Machtiging aanvragen bij klant
          </button>
        )}

        {authorization && authorization.status === "wacht_op_klant" && (
          <div className="dossier-status pending">
            <Clock size={16} />
            Wachtend op het ingevulde formulier van de klant (aangevraagd {fmtDate(authorization.requested_at)})
            <div className="dossier-status-actions">
              <button className="btn-ghost" onClick={cancel} disabled={busy}>
                <X size={14} /> Intrekken
              </button>
            </div>
          </div>
        )}

        {authorization && authorization.status === "ondertekend" && (
          <div className="dossier-status signed">
            <CheckCircle2 size={16} />
            Ontvangen van {authorization.client_signed_by} op {fmtDate(authorization.client_signed_at as string)}
            {formFileUrl && (
              <div className="dossier-status-actions">
                <a href={formFileUrl} target="_blank" rel="noreferrer" className="btn-primary">
                  <Download size={13} /> Bekijk ingevuld formulier
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      {authorization?.status === "ondertekend" ? (
        <div className="dossier-status signed">
          <CheckCircle2 size={16} />
          U heeft het machtigingsformulier geüpload op {fmtDate(authorization.client_signed_at as string)}
          <div className="dossier-status-actions">
            {formFileUrl && (
              <a href={formFileUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                <Download size={13} /> Bekijk uw upload
              </a>
            )}
          </div>
        </div>
      ) : (
        authorization && (
          <>
            <div className="add-form">
              <div className="add-form-title">Machtigingsformulier ISDE voor woningeigenaren</div>
              <p>
                Download hieronder het officiële formulier van de Rijksdienst voor Ondernemend Nederland (RVO), vul het in, onderteken
                het, en upload daarna een foto of scan terug.
              </p>
              <a href={RVO_FORM_URL} target="_blank" rel="noreferrer" className="btn-ghost" style={{ width: "fit-content" }}>
                <Download size={14} /> Download het RVO-formulier
              </a>
            </div>

            <div className="field-with-label">
              <span className="field-label">Ingevuld en ondertekend formulier</span>
              <FileCaptureButtons accept="image/*,application/pdf" onPicked={handlePicked} busy={busy} />
              <FilePreview
                previewUrl={pending?.previewUrl ?? null}
                fileType={pending?.fileType ?? null}
                fileName={pending?.fileName ?? null}
                onClear={() => setPending(null)}
              />
            </div>
            {pending && (
              <button type="button" className="btn-primary" onClick={confirmUpload} disabled={busy} style={{ width: "fit-content" }}>
                <Upload size={14} /> Uploaden
              </button>
            )}
          </>
        )
      )}
    </div>
  );
}
