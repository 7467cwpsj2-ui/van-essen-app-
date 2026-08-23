"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Download, FileSignature, X } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { cancelSubsidyAuthorization, requestSubsidyAuthorization, signSubsidyAuthorization } from "@/lib/actions/subsidies";
import { createClient } from "@/lib/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import { SUBSIDY_AUTHORIZATION_SCOPE_LABEL } from "@/types/database";
import type { CompanyDetails, Role, SubsidyAuthorization } from "@/types/database";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export function AuthorizationPanel({
  projectId,
  role,
  clientName,
  projectAddress,
  company,
  authorization,
}: {
  projectId: string;
  role: Role;
  clientName: string | null;
  projectAddress: string | null;
  company: CompanyDetails;
  authorization: SubsidyAuthorization | null;
}) {
  const [signing, setSigning] = useState(false);
  const [busy, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  const request = () => run(() => requestSubsidyAuthorization(projectId));

  const cancel = () => {
    if (!authorization) return;
    if (!confirm("Deze aanvraag intrekken?")) return;
    run(() => cancelSubsidyAuthorization(authorization.id, projectId));
  };

  const handleSign = async (blob: Blob) => {
    if (!authorization) return;
    const supabase = createClient();
    const path = `${projectId}/machtiging/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await uploadWithRetry(supabase, path, blob, { contentType: "image/png" });
    if (uploadError) throw new Error(uploadError.message);
    await signSubsidyAuthorization(authorization.id, projectId, path);
    setSigning(false);
  };

  if (role !== "klant") {
    return (
      <div className="panel">
        <div className="hint-bar">
          Met dit machtigingsformulier geeft de klant Van Essen officieel toestemming om namens hem/haar de ISDE-subsidieaanvraag in
          te dienen, te beheren en eventueel bezwaar te maken — precies zoals RVO dat vereist. Het hoeft niet naar RVO gestuurd te
          worden; bewaar het in je eigen administratie, RVO kan er later om vragen.
        </div>

        {!authorization && (
          <button className="btn-primary" onClick={request} disabled={busy} style={{ width: "fit-content" }}>
            <FileSignature size={14} /> Machtiging aanvragen bij klant
          </button>
        )}

        {authorization && authorization.status === "wacht_op_klant" && (
          <div className="dossier-status pending">
            <Clock size={16} />
            Wachtend op ondertekening door de klant (aangevraagd {fmtDate(authorization.requested_at)})
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
            Ondertekend door {authorization.client_signed_by} op {fmtDate(authorization.client_signed_at as string)}
            <div className="dossier-status-actions">
              <a href={`/api/projects/${projectId}/machtiging-pdf`} target="_blank" rel="noreferrer" className="btn-primary">
                <Download size={13} /> Download machtigingsformulier
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      {signing && <SignaturePad title="Onderteken de machtiging" onCancel={() => setSigning(false)} onSave={handleSign} />}

      {authorization?.status === "ondertekend" ? (
        <div className="dossier-status signed">
          <CheckCircle2 size={16} />
          U heeft deze machtiging ondertekend op {fmtDate(authorization.client_signed_at as string)}
          <div className="dossier-status-actions">
            <a href={`/api/projects/${projectId}/machtiging-pdf`} target="_blank" rel="noreferrer" className="btn-primary">
              <Download size={13} /> Download uw exemplaar
            </a>
          </div>
        </div>
      ) : (
        authorization && (
          <>
            <div className="add-form">
              <div className="add-form-title">Machtigingsformulier ISDE voor woningeigenaren</div>
              <p>
                Ondergetekende, {clientName || "de woningeigenaar"}, van de woning op {projectAddress || "het opgegeven adres"},
                machtigt hierbij:
              </p>
              <p>
                <b>{company.company_name}</b>
                {company.company_kvk && <> (KVK {company.company_kvk})</>}
                {company.company_address && <>, {company.company_address}</>}
                {company.company_postal_city && <>, {company.company_postal_city}</>}
              </p>
              <p>
                om namens ondergetekende {SUBSIDY_AUTHORIZATION_SCOPE_LABEL[authorization.scope]} bij de Rijksdienst voor
                Ondernemend Nederland (RVO) voor de Investeringssubsidie duurzame energie en energiebesparing (ISDE).
              </p>
              <div className="hint-bar small">
                Dit formulier wordt niet naar RVO gestuurd, maar bewaard in de administratie van {company.company_name} en kan
                later door RVO worden opgevraagd.
              </div>
            </div>
            <button className="btn-primary" onClick={() => setSigning(true)} style={{ width: "fit-content" }}>
              <FileSignature size={14} /> Ondertekenen
            </button>
          </>
        )
      )}
    </div>
  );
}
