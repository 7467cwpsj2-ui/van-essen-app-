import { notFound } from "next/navigation";
import { FileText, Lock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDossierData } from "@/lib/dossierData";
import { warrantyEndDate } from "@/lib/warranty";
import { Brandmark } from "@/components/Brandmark";
import { WARRANTY_TYPE_LABEL } from "@/types/database";
import type { PhotoCategory } from "@/types/database";

export const dynamic = "force-dynamic";

const fmtEuro = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

const PHOTO_STORY_LABEL: Record<Exclude<PhotoCategory, "oplevering">, string> = {
  voor: "Voor de start",
  tijdens: "Tijdens de werkzaamheden",
  na: "Na afronding",
};

export default async function PublicDossierPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: project } = await admin.from("projects").select("id").eq("dossier_share_token", params.token).single();
  if (!project) notFound();

  const data = await loadDossierData(admin, project.id as string, 3600, true);
  if (!data) notFound();

  const { project: p } = data;
  const meerwerk = data.extraWork.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerk = data.extraWork.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);
  const eindtotaal = Number(p.quote_amount || 0) + meerwerk - minderwerk;
  const warrantyBase = p.delivery_signed_at || p.delivery_date;

  const photoSection = (title: string, photos: { id: string; title: string; url: string | null }[]) =>
    photos.length > 0 && (
      <div key={title}>
        <div className="dash-section-title">{title}</div>
        <div className="drawing-grid">
          {photos.map((ph) => (
            <div key={ph.id} className="drawing-card">
              {ph.url && (
                <a href={ph.url} target="_blank" rel="noreferrer" className="thumb-btn">
                  <img src={ph.url} alt="" className="drawing-thumb" />
                </a>
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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <Brandmark />
      </div>
      <div className="panel">
        <div className="hint-bar small">Dit is een leesalleen weergave van het opleverdossier, gedeeld via een link.</div>

        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, margin: "8px 0 0", textTransform: "uppercase" }}>
          {p.name}
        </h1>
        <div className="hint-bar small" style={{ marginTop: 4 }}>
          {p.address}
          {data.clientName ? ` — ${data.clientName}` : ""}
        </div>

        <div className="calc-summary">
          <div className="calc-line">
            <span>Offertebedrag</span>
            <span className="mono">{fmtEuro(p.quote_amount)}</span>
          </div>
          <div className="calc-line">
            <span>Meerwerk (akkoord)</span>
            <span className="mono">{fmtEuro(meerwerk)}</span>
          </div>
          <div className="calc-line">
            <span>Minderwerk (akkoord)</span>
            <span className="mono">− {fmtEuro(minderwerk)}</span>
          </div>
          <div className="calc-line calc-line-strong">
            <span>Eindtotaal</span>
            <span className="mono">{fmtEuro(eindtotaal)}</span>
          </div>
        </div>

        {data.completionPoints.length > 0 && (
          <div>
            <div className="dash-section-title">Opleverpunten</div>
            <div className="work-list">
              {data.completionPoints.map((c) => (
                <div key={c.id} className="list-row">
                  <div className="list-row-body">
                    <div className="list-row-title">{c.description}</div>
                  </div>
                  <span className={"stamp " + (c.status === "goedgekeurd" ? "stamp-akkoord" : "stamp-open")}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.clientChoices.length > 0 && (
          <div>
            <div className="dash-section-title">Klantkeuzes</div>
            <div className="work-list">
              {data.clientChoices.map((c) => (
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

        {(["voor", "tijdens", "na"] as const).map((cat) => photoSection(PHOTO_STORY_LABEL[cat], data.photosByCategory[cat]))}
        {photoSection("Opleverfoto's", data.photosByCategory.oplevering)}

        {data.drawings.length > 0 && (
          <div>
            <div className="dash-section-title">Tekeningen</div>
            <div className="drawing-grid">
              {data.drawings.map((d) => (
                <div key={d.id} className="drawing-card">
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="thumb-btn">
                      {d.fileType === "pdf" ? (
                        <div className="drawing-icon">
                          <FileText size={20} />
                        </div>
                      ) : (
                        <img src={d.url} alt="" className="drawing-thumb" />
                      )}
                    </a>
                  )}
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
          {p.warranty_text && <div className="hint-bar small">{p.warranty_text}</div>}
          <div className="warranty-list">
            {data.warrantyItems.map((w) => {
              const base = w.start_date || warrantyBase;
              const end = base ? warrantyEndDate(base, w.amount, w.unit) : null;
              return (
                <div key={w.id} className="warranty-row">
                  <div>
                    {w.item}
                    <span className={"stamp " + (w.warranty_type === "fabrikant" ? "stamp-open" : "stamp-akkoord")} style={{ marginLeft: 8 }}>
                      {WARRANTY_TYPE_LABEL[w.warranty_type]}
                    </span>
                    {w.manufacturer && <div className="hint-bar small" style={{ marginTop: 2 }}>{w.manufacturer}</div>}
                    {w.certificateUrl && (
                      <a href={w.certificateUrl} target="_blank" rel="noreferrer" className="work-attachment-link" style={{ marginTop: 4 }}>
                        Certificaat bekijken
                      </a>
                    )}
                  </div>
                  <span style={{ marginLeft: "auto", textAlign: "right" }}>
                    <b style={{ marginLeft: 0 }}>
                      {w.amount} {w.unit}
                    </b>
                    {end && <span style={{ display: "block", fontSize: 11, color: "var(--text-faint)" }}>tot {fmtDate(end)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {p.delivery_signed_by && (
          <div className="hint-bar">
            <Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
            Ondertekend door {p.delivery_signed_by} op {p.delivery_signed_at && fmtDate(p.delivery_signed_at)}.
          </div>
        )}
      </div>
    </div>
  );
}
