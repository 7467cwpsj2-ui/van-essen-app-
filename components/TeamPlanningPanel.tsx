import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ScrollToToday } from "@/components/ScrollToToday";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const PROJECT_COLORS = ["#2f6fed", "#dd6b20", "#38a169", "#d53f8c", "#805ad5", "#319795", "#c05621", "#3182ce", "#b7791f", "#4c51bf"];

function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

export interface PlanningRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  assignee: string | null;
  start_date: string;
  end_date: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function TeamPlanningPanel({ rows }: { rows: PlanningRow[] }) {
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

  const conflictIds = new Set<string>();
  for (const a of rows) {
    if (!a.assignee) continue;
    for (const b of rows) {
      if (
        a.id !== b.id &&
        b.assignee &&
        a.assignee.toLowerCase() === b.assignee.toLowerCase() &&
        overlaps(a.start_date, a.end_date, b.start_date, b.end_date)
      ) {
        conflictIds.add(a.id);
      }
    }
  }

  const days: Date[] = [];
  if (rows.length) {
    const min = Math.min(...rows.map((r) => new Date(r.start_date).getTime()));
    const max = Math.max(...rows.map((r) => new Date(r.end_date).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }
  const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

  const projectLegend = Array.from(new Map(rows.map((r) => [r.projectId, r.projectName])).entries());

  return (
    <div className="panel">
      <div className="hint-bar">
        Overzicht van de bouwplanning van al je projecten samen, op één tijdlijn — zo zie je in één oogopslag wie waar en wanneer loopt,
        en of iemand op hetzelfde moment op twee projecten staat ingepland. Scroll horizontaal om verder terug of vooruit te kijken.
      </div>
      {rows.length === 0 && <div className="empty-hint">Nog geen bouwplanning met een toegewezen persoon gevonden.</div>}
      {projectLegend.length > 0 && (
        <div className="planning-legend">
          {projectLegend.map(([id, name]) => (
            <span key={id} className="planning-legend-item">
              <span className="planning-legend-dot" style={{ background: colorForProject(id) }} />
              {name}
            </span>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <ScrollToToday todayIdx={todayIdx}>
          <div className="gantt-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, 30px)` }}>
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div
                  key={idx}
                  className={"gantt-cell gantt-head" + (wd === 0 || wd === 6 ? " weekend" : "") + (idx === todayIdx ? " today" : "")}
                  title={d.toISOString().slice(0, 10)}
                >
                  <span className="gantt-head-day">{d.getUTCDate()}</span>
                  <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                </div>
              );
            })}

            {rows.map((r, i) => {
              const start = new Date(r.start_date).getTime();
              const end = new Date(r.end_date).getTime();
              const filledFlags = days.map((d) => {
                const t = d.getTime();
                const wd = d.getUTCDay();
                return t >= start && t <= end && wd !== 0 && wd !== 6;
              });
              const groupStart = i === 0 || rows[i - 1].assignee !== r.assignee;
              const color = colorForProject(r.projectId);
              return (
                <div key={r.id} style={{ display: "contents" }}>
                  <div className={"gantt-cell gantt-row-label" + (groupStart ? " planning-row-first" : "")}>
                    <div className="gantt-row-title">
                      {r.assignee ?? "Nog niet toegewezen"}
                      {conflictIds.has(r.id) && (
                        <span className="gantt-conflict-icon" title="Overlapt met een andere planning van deze persoon.">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                    <div className="gantt-row-sub">
                      <Link href={`/projects/${r.projectId}/bouwplanning`} className="gantt-row-title-link">
                        {r.projectName}
                      </Link>
                      <span>· {r.title}</span>
                    </div>
                  </div>
                  {days.map((d, idx) => {
                    const wd = d.getUTCDay();
                    const filled = filledFlags[idx];
                    const isFirst = filled && !filledFlags[idx - 1];
                    const isLast = filled && !filledFlags[idx + 1];
                    return (
                      <div
                        key={idx}
                        className={
                          "gantt-cell gantt-daycell" +
                          (filled ? " filled" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (wd === 0 || wd === 6 ? " weekend" : "")
                        }
                        style={filled ? { background: color } : undefined}
                        title={filled ? `${r.projectName} — ${r.title}: ${r.start_date} – ${r.end_date}` : ""}
                      />
                    );
                  })}
                </div>
              );
            })}

            {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${220 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
          </div>
        </ScrollToToday>
      )}
    </div>
  );
}
