"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

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

interface DayCell {
  blockKey: string | null;
  background: string | null;
  label: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

function ScrollToToday({ todayIdx, children }: { todayIdx: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && todayIdx >= 0) ref.current.scrollLeft = Math.max(0, (todayIdx - 3) * 30);
  }, [todayIdx]);
  return (
    <div className="gantt-scroll" ref={ref}>
      {children}
    </div>
  );
}

export function TeamPlanningPanel({ rows }: { rows: PlanningRow[] }) {
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

  const assigned = rows.filter((r) => r.assignee);
  const people = Array.from(new Set(assigned.map((r) => r.assignee as string))).sort((a, b) => a.localeCompare(b, "nl"));

  const days: Date[] = [];
  if (assigned.length) {
    const min = Math.min(...assigned.map((r) => new Date(r.start_date).getTime()));
    const max = Math.max(...assigned.map((r) => new Date(r.end_date).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }
  const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

  const legend = Array.from(new Map(assigned.map((r) => [r.projectId, r.projectName])).entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "nl")
  );

  return (
    <div className="panel">
      <div className="hint-bar">
        Personeelsplanning over al je projecten heen — elke rij is één persoon, elke kleur een project. Zo zie je in één oogopslag wie
        waar en wanneer loopt, en of iemand op hetzelfde moment dubbel is ingepland (gestreepte cel).
      </div>
      {legend.length > 0 && (
        <div className="planning-legend">
          {legend.map(([id, name]) => (
            <Link key={id} href={`/projects/${id}/bouwplanning`} className="planning-legend-item">
              <span className="planning-legend-dot" style={{ background: colorForProject(id) }} />
              {name}
            </Link>
          ))}
        </div>
      )}
      {people.length === 0 ? (
        <div className="empty-hint">Nog geen bouwplanning met een toegewezen persoon gevonden.</div>
      ) : (
        <ScrollToToday todayIdx={todayIdx}>
          <div className="gantt-grid" style={{ gridTemplateColumns: `160px repeat(${days.length}, 30px)` }}>
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div
                  key={idx}
                  className={
                    "gantt-cell gantt-head" +
                    (wd === 0 || wd === 6 ? " weekend" : "") +
                    (idx === todayIdx ? " today" : "") +
                    (d.getUTCDate() === 1 ? " month-start" : "")
                  }
                  title={d.toISOString().slice(0, 10)}
                >
                  <span className="gantt-head-day">{d.getUTCDate()}</span>
                  <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                </div>
              );
            })}

            {people.map((person) => {
              const personRows = assigned.filter((r) => r.assignee === person);
              const cells: DayCell[] = days.map((d) => {
                const wd = d.getUTCDay();
                if (wd === 0 || wd === 6) return { blockKey: null, background: null, label: "" };
                const iso = d.toISOString().slice(0, 10);
                const matches = personRows.filter((r) => r.start_date <= iso && iso <= r.end_date);
                if (matches.length === 0) return { blockKey: null, background: null, label: "" };
                if (matches.length === 1) {
                  const color = colorForProject(matches[0].projectId);
                  return { blockKey: matches[0].projectId, background: color, label: `${matches[0].projectName} — ${matches[0].title}` };
                }
                const colors = Array.from(new Set(matches.map((m) => colorForProject(m.projectId))));
                const stripe =
                  colors.length === 1
                    ? colors[0]
                    : `repeating-linear-gradient(45deg, ${colors[0]}, ${colors[0]} 6px, ${colors[1]} 6px, ${colors[1]} 12px)`;
                return {
                  blockKey: "conflict:" + colors.join(","),
                  background: stripe,
                  label: "Dubbel ingepland: " + matches.map((m) => `${m.projectName} — ${m.title}`).join(" / "),
                };
              });
              const hasConflict = cells.some((c) => c.blockKey?.startsWith("conflict:"));

              return (
                <div key={person} style={{ display: "contents" }}>
                  <div className="gantt-cell gantt-row-label">
                    <div className="gantt-row-title">
                      {person}
                      {hasConflict && (
                        <span className="gantt-conflict-icon" title="Deze persoon staat op hetzelfde moment op meerdere projecten ingepland.">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                  {cells.map((cell, idx) => {
                    const isFirst = cell.blockKey !== null && cells[idx - 1]?.blockKey !== cell.blockKey;
                    const isLast = cell.blockKey !== null && cells[idx + 1]?.blockKey !== cell.blockKey;
                    const wd = days[idx].getUTCDay();
                    return (
                      <div
                        key={idx}
                        className={
                          "gantt-cell gantt-daycell" +
                          (cell.blockKey !== null ? " filled" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (wd === 0 || wd === 6 ? " weekend" : "")
                        }
                        style={cell.background ? { background: cell.background } : undefined}
                        title={cell.label}
                      />
                    );
                  })}
                </div>
              );
            })}

            {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${160 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
          </div>
        </ScrollToToday>
      )}
    </div>
  );
}
