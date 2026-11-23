"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatProjectNumber } from "@/lib/projectNumber";
import type { QuickJobListItem } from "@/lib/data";

type Filter = "open" | "afgerond" | "alle";

const fmtShort = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

// Simpele, snel doorzoekbare lijst van alle losse klussen — zonder
// bedragen/marges (dat is Nacalculatie, owner-only), zodat ook
// personeel in één tik een klus en het bijbehorende projectnummer kan
// terugvinden, in plaats van door de Gantt-planning te moeten scrollen.
export function LosseKlussenListPanel({ jobs }: { jobs: QuickJobListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("open");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = jobs.filter((j) => filter === "alle" || (filter === "open" ? !j.done : j.done));
    if (q) {
      list = list.filter((j) => {
        const number =
          j.projectNumber != null && j.projectNumberYear != null ? formatProjectNumber(j.projectNumberYear, j.projectNumber) : "";
        return (
          j.title.toLowerCase().includes(q) ||
          (j.address ?? "").toLowerCase().includes(q) ||
          j.assigneeNames.toLowerCase().includes(q) ||
          number.includes(q)
        );
      });
    }
    return list;
  }, [jobs, filter, query]);

  return (
    <div className="panel">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">Losse klussen</h1>

      <div className="uren-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Zoek op titel, adres, naam of projectnummer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mode-toggle">
        {(["open", "afgerond", "alle"] as Filter[]).map((f) => (
          <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f === "open" ? "Open" : f === "afgerond" ? "Afgerond" : "Alles"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint small">Niets te zien in deze weergave.</div>
      ) : (
        <div className="task-list">
          {filtered.map((j) => {
            const sameDay = j.startDate === j.endDate;
            const dateLabel = sameDay ? fmtShort(j.startDate) : `${fmtShort(j.startDate)} – ${fmtShort(j.endDate)}`;
            const number =
              j.projectNumber != null && j.projectNumberYear != null ? formatProjectNumber(j.projectNumberYear, j.projectNumber) : null;
            return (
              <Link key={j.id} href={`/klussen/${j.id}`} className="task-row">
                <div className="task-body">
                  <div className="task-title">{j.title}</div>
                  <div className="task-meta">
                    {dateLabel}
                    {j.address ? ` · ${j.address}` : ""}
                    {j.assigneeNames ? ` · ${j.assigneeNames}` : ""}
                  </div>
                  <div className="task-meta mono">
                    {number && <>#{number}</>}
                    {j.done && (
                      <span className="stamp stamp-akkoord" style={{ marginLeft: 8 }}>
                        Gereed
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
