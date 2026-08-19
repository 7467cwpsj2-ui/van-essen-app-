"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { PermGrid } from "@/components/PermGrid";
import {
  removeClient,
  setClientProject,
  toggleClientCanEditSchedule,
  toggleClientModulePermission,
  updateClientDetails,
} from "@/lib/actions/clients";
import type { Client, ModuleKey } from "@/types/database";
import { MODULE_KEYS } from "@/types/database";

export function ClientRow({
  client,
  projects,
}: {
  client: Client;
  projects: { id: string; name: string; clientIds: string[] }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(client.name);
  const [, startTransition] = useTransition();
  const permCount = MODULE_KEYS.filter((k) => client.permissions[k]).length;
  const linkedProjects = projects.filter((p) => p.clientIds.includes(client.id));

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  return (
    <div className={"access-item client-row" + (expanded ? " expanded" : "")}>
      <button type="button" className="access-summary" onClick={() => setExpanded((v) => !v)}>
        <span className="access-avatar">{(client.name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="access-summary-main">
          <span className="access-summary-name">{client.name}</span>
          <span className="access-summary-sub">
            {permCount}/{MODULE_KEYS.length} onderdelen zichtbaar · {linkedProjects.length} project
            {linkedProjects.length === 1 ? "" : "en"}
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
              onBlur={() => name.trim() && name !== client.name && run(() => updateClientDetails(client.id, { name: name.trim() }))}
            />
            <button
              type="button"
              className="icon-btn danger ghost"
              title="Verwijderen"
              onClick={() => {
                if (confirm(`${client.name} verwijderen? Diegene verliest direct alle toegang.`)) {
                  run(() => removeClient(client.id));
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <PermGrid perm={client.permissions} onToggle={(key: ModuleKey) => run(() => toggleClientModulePermission(client.id, key, !client.permissions[key]))} />
          <label className="checkbox-label edit-right">
            <input
              type="checkbox"
              checked={client.can_edit_schedule}
              onChange={() => run(() => toggleClientCanEditSchedule(client.id, !client.can_edit_schedule))}
            />
            Mag de bouwplanning zelf bewerken (zelden nodig)
          </label>
          <div className="project-access">
            <div className="access-summary-sub">Welke project(en) ziet deze klant?</div>
            <div className="project-access-list">
              {projects.length === 0 && <span className="empty-hint">Nog geen projecten aangemaakt.</span>}
              {projects.map((p) => {
                const checked = p.clientIds.includes(client.id);
                const otherCount = p.clientIds.filter((id) => id !== client.id).length;
                return (
                  <label key={p.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => run(() => setClientProject(client.id, p.id, !checked))}
                    />
                    {p.name}
                    {otherCount > 0 && (
                      <span className="access-summary-sub"> — ook gekoppeld aan {otherCount} andere klant{otherCount === 1 ? "" : "en"}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
