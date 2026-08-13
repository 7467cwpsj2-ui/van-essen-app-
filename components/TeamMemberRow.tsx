"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { PermGrid } from "@/components/PermGrid";
import {
  removeTeamMember,
  toggleTeamCanEditSchedule,
  toggleTeamModulePermission,
  toggleTeamProjectAccess,
  toggleTeamSeesAllProjects,
  updateTeamMemberDetails,
  updateTeamMemberType,
} from "@/lib/actions/team";
import type { ModuleKey, TeamMember, TeamMemberType } from "@/types/database";

const TRADES = [
  "Timmerman",
  "Metselaar",
  "Stucadoor",
  "Schilder",
  "Loodgieter",
  "Elektricien",
  "Dakdekker",
  "Grondwerker",
  "Overig",
];

export function TeamMemberRow({
  member,
  projects,
  access,
}: {
  member: TeamMember;
  projects: { id: string; name: string }[];
  access: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(member.name);
  const isKnownTrade = TRADES.includes(member.trade || "");
  const [tradeSel, setTradeSel] = useState(isKnownTrade ? member.trade! : "Overig");
  const [customTrade, setCustomTrade] = useState(isKnownTrade ? "" : member.trade || "");
  const [hourlyRate, setHourlyRate] = useState(member.hourly_rate != null ? String(member.hourly_rate) : "");
  const [, startTransition] = useTransition();

  const projectCount = member.sees_all_projects ? projects.length : access.length;

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  const commitTrade = (sel: string, custom: string) => {
    const finalTrade = sel === "Overig" ? custom || "Overig" : sel;
    run(() => updateTeamMemberDetails(member.id, { trade: finalTrade }));
  };

  return (
    <div className={"access-item team-row" + (expanded ? " expanded" : "")}>
      <button type="button" className="access-summary" onClick={() => setExpanded((v) => !v)}>
        <span className="access-avatar">{(member.name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="access-summary-main">
          <span className="access-summary-name">
            {member.name}
            <span className={"member-type-pill" + (member.member_type === "personeel" ? " personeel" : "")}>
              {member.member_type === "personeel" ? "Eigen personeel" : "Onderaannemer"}
            </span>
          </span>
          <span className="access-summary-sub">
            {member.trade || "Overig"} ·{" "}
            {member.sees_all_projects ? "alle projecten" : `${projectCount} project${projectCount === 1 ? "" : "en"}`}
          </span>
        </span>
        <ChevronDown size={14} className={"access-chevron" + (expanded ? " open" : "")} />
      </button>
      {expanded && (
        <div className="access-details">
          <div className="client-row-top">
            <input
              className="access-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== member.name && run(() => updateTeamMemberDetails(member.id, { name: name.trim() }))}
            />
            <select
              value={tradeSel}
              onChange={(e) => {
                setTradeSel(e.target.value);
                commitTrade(e.target.value, customTrade);
              }}
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {tradeSel === "Overig" && (
              <input
                className="trade-custom-input"
                placeholder="Functie"
                value={customTrade}
                onChange={(e) => setCustomTrade(e.target.value)}
                onBlur={() => commitTrade("Overig", customTrade)}
              />
            )}
            <button
              type="button"
              className="icon-btn danger ghost"
              title="Verwijderen"
              onClick={() => {
                if (confirm(`${member.name} verwijderen? Diegene verliest direct alle toegang.`)) {
                  run(() => removeTeamMember(member.id));
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <label className="field-with-label">
            <span className="field-label">Uurtarief (voor nacalculatie, optioneel)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="bv. 45.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              onBlur={() =>
                run(() => updateTeamMemberDetails(member.id, { hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null }))
              }
            />
          </label>
          <div className="radio-row">
            <label className="checkbox-label">
              <input
                type="radio"
                name={`member_type_${member.id}`}
                checked={member.member_type === "personeel"}
                onChange={() => run(() => updateTeamMemberType(member.id, "personeel" as TeamMemberType))}
              />
              Eigen personeel
            </label>
            <label className="checkbox-label">
              <input
                type="radio"
                name={`member_type_${member.id}`}
                checked={member.member_type === "onderaannemer"}
                onChange={() => run(() => updateTeamMemberType(member.id, "onderaannemer" as TeamMemberType))}
              />
              Team / onderaannemer
            </label>
          </div>
          <PermGrid perm={member.permissions} onToggle={(key: ModuleKey) => run(() => toggleTeamModulePermission(member.id, key, !member.permissions[key]))} />
          <label className="checkbox-label edit-right">
            <input
              type="checkbox"
              checked={member.can_edit_schedule}
              onChange={() => run(() => toggleTeamCanEditSchedule(member.id, !member.can_edit_schedule))}
            />
            Mag de bouwplanning zelf bewerken (i.p.v. alleen bekijken)
          </label>
          <div className="project-access">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={member.sees_all_projects}
                onChange={() => run(() => toggleTeamSeesAllProjects(member.id, !member.sees_all_projects))}
              />
              Ziet alle projecten
            </label>
            <div className="access-summary-sub">
              {member.sees_all_projects
                ? "Zet uit om per project te kiezen — voor nu ziet dit teamlid alles hieronder."
                : "Kies hieronder welke projecten dit teamlid mag zien."}
            </div>
            <div className="project-access-list">
              {projects.length === 0 && <span className="empty-hint">Nog geen projecten aangemaakt.</span>}
              {projects.map((p) => (
                <label key={p.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={member.sees_all_projects || access.includes(p.id)}
                    disabled={member.sees_all_projects}
                    onChange={() => run(() => toggleTeamProjectAccess(member.id, p.id, !access.includes(p.id)))}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
