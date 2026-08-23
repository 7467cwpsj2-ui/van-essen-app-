import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDirectMessageThreads } from "@/lib/data";
import { timeAgo } from "@/lib/timeAgo";

const MEMBER_TYPE_LABEL: Record<string, string> = {
  personeel: "Eigen personeel",
  onderaannemer: "Onderaannemer",
};

export default async function BerichtenPage() {
  const current = await requireUser();

  if (current.profile.role === "klant") redirect("/dashboard");
  if (current.profile.role === "team") {
    if (!current.profile.team_member_id) redirect("/dashboard");
    redirect(`/berichten/${current.profile.team_member_id}`);
  }

  const threads = await getDirectMessageThreads();

  return (
    <div>
      <div className="header-eyebrow">Rechtstreeks contact</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase" }}>
        Berichten
      </h1>
      <div className="hint-bar" style={{ margin: "12px 0 16px" }}>
        Eén doorlopend gesprek per teamlid of onderaannemer, los van een project — handig voor iemand die aan meerdere projecten
        tegelijk werkt.
      </div>
      {threads.length === 0 ? (
        <div className="empty-hint">Nog geen teamleden om mee te chatten.</div>
      ) : (
        <div className="dash-panel-list">
          {threads.map((t) => (
            <Link key={t.teamMemberId} href={`/berichten/${t.teamMemberId}`} className="dash-panel-row">
              <div className="dash-panel-row-icon">
                <MessageCircle size={14} />
              </div>
              <div className="dash-panel-row-body">
                <div className="dash-panel-row-title">
                  {t.name}{" "}
                  <span className="vis-pill vis-public" style={{ marginLeft: 4 }}>
                    {MEMBER_TYPE_LABEL[t.memberType] ?? t.memberType}
                  </span>
                </div>
                <div className="dash-panel-row-sub">
                  {t.lastText
                    ? t.lastText
                    : t.lastFileType
                    ? (
                        <>
                          <FileText size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} />
                          {t.lastFileType === "image" ? "Foto" : "Bestand"}
                        </>
                      )
                    : t.trade || "Nog geen berichten"}
                  {t.lastAt ? ` · ${timeAgo(t.lastAt)}` : ""}
                </div>
              </div>
              {t.unreadCount > 0 && <span className="notif-badge" style={{ position: "static" }}>{t.unreadCount}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
