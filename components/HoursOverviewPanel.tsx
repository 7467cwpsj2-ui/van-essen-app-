"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { mondayOfWeek, monthRange, sundayOfWeek } from "@/lib/workingDays";

export interface HoursOverviewEntry {
  id: string;
  memberId: string;
  memberName: string;
  targetKey: string;
  targetName: string;
  targetHref: string;
  workDate: string;
  hours: number;
}

type Period = "week" | "last_week" | "month" | "custom";
type GroupBy = "persoon" | "project";

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

function fmtDay(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

function fmtHours(h: number) {
  const rounded = Math.round(h * 100) / 100;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(2).replace(/0$/, "").replace(".", ",")} uur`;
}

// Samenvatting over alle projecten/klussen heen — bedoeld voor de
// eigenaar, die anders elke klus apart zou moeten openen om te zien wie
// hoeveel uur heeft geschreven. Periode en groepering zijn bewust puur
// client-side state (alle uren zijn al in één keer meegegeven), zodat
// wisselen instant is en niet elke keer een nieuwe pagina laadt.
export function HoursOverviewPanel({ entries }: { entries: HoursOverviewEntry[] }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState(mondayOfWeek(todayIso));
  const [customTo, setCustomTo] = useState(todayIso);
  const [groupBy, setGroupBy] = useState<GroupBy>("persoon");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const range = useMemo(() => {
    if (period === "last_week") {
      const lastMonday = new Date(new Date(mondayOfWeek(todayIso) + "T00:00:00Z").getTime() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      return { from: lastMonday, to: sundayOfWeek(lastMonday), label: "Vorige week" };
    }
    if (period === "month") {
      const { start, end } = monthRange(todayIso);
      return { from: start, to: end, label: "Deze maand" };
    }
    if (period === "custom") {
      return { from: customFrom, to: customTo, label: "Aangepaste periode" };
    }
    return { from: mondayOfWeek(todayIso), to: sundayOfWeek(todayIso), label: "Deze week" };
  }, [period, todayIso, customFrom, customTo]);

  const filtered = useMemo(
    () => entries.filter((e) => e.workDate >= range.from && e.workDate <= range.to),
    [entries, range]
  );

  const total = filtered.reduce((s, e) => s + e.hours, 0);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; href: string | null; total: number; entries: HoursOverviewEntry[] }>();
    for (const e of filtered) {
      const key = groupBy === "persoon" ? e.memberId : e.targetKey;
      const label = groupBy === "persoon" ? e.memberName : e.targetName;
      const href = groupBy === "project" ? e.targetHref : null;
      const g = map.get(key) ?? { key, label, href, total: 0, entries: [] };
      g.total += e.hours;
      g.entries.push(e);
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="mode-toggle">
          {(["week", "last_week", "month", "custom"] as Period[]).map((p) => (
            <button key={p} type="button" className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
              {p === "week" ? "Deze week" : p === "last_week" ? "Vorige week" : p === "month" ? "Deze maand" : "Aangepast"}
            </button>
          ))}
        </div>
        <div className="mode-toggle">
          <button type="button" className={groupBy === "persoon" ? "active" : ""} onClick={() => setGroupBy("persoon")}>
            Per persoon
          </button>
          <button type="button" className={groupBy === "project" ? "active" : ""} onClick={() => setGroupBy("project")}>
            Per project
          </button>
        </div>
      </div>

      {period === "custom" && (
        <div className="add-form-grid">
          <label className="field-with-label">
            <span className="field-label">Van</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </label>
          <label className="field-with-label">
            <span className="field-label">Tot en met</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </label>
        </div>
      )}

      <div className="calc-line calc-line-strong">
        <span>
          Totaal — {range.label.toLowerCase()} ({fmtShort(range.from)} – {fmtShort(range.to)})
        </span>
        <span className="mono">{fmtHours(total)}</span>
      </div>

      {groups.length === 0 ? (
        <div className="empty-hint small">Geen uren geregistreerd in deze periode.</div>
      ) : (
        <div className="access-list">
          {groups.map((g) => (
            <div key={g.key} className={"access-item hours-row" + (expanded.has(g.key) ? " expanded" : "")}>
              <button type="button" className="access-summary" onClick={() => toggle(g.key)}>
                <span className="access-summary-main">
                  <span className="access-summary-name">{g.label}</span>
                  <span className="access-summary-sub">
                    {g.entries.length} registratie{g.entries.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="mono" style={{ marginRight: 4 }}>
                  {fmtHours(g.total)}
                </span>
                <ChevronDown size={14} className={"access-chevron" + (expanded.has(g.key) ? " open" : "")} />
              </button>
              {expanded.has(g.key) && (
                <div className="access-details">
                  <div className="task-list">
                    {[...g.entries]
                      .sort((a, b) => b.workDate.localeCompare(a.workDate))
                      .map((e) => (
                        <div key={e.id} className="task-row">
                          <div className="task-body">
                            <div className="task-title">{fmtDay(e.workDate)}</div>
                            <div className="task-meta">
                              {groupBy === "persoon" ? (
                                <Link href={e.targetHref} className="link-btn" style={{ display: "inline" }}>
                                  {e.targetName}
                                </Link>
                              ) : (
                                <span>{e.memberName}</span>
                              )}
                              <span className="mono">{fmtHours(e.hours)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
