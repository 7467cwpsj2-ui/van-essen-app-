"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Copy, RefreshCw, Trash2 } from "lucide-react";
import { PermGrid } from "@/components/PermGrid";
import { colorForKey, readableTextColor } from "@/lib/projectColor";
import {
  removeClient,
  resendClientInvite,
  setClientProject,
  toggleClientCanEditSchedule,
  toggleClientModulePermission,
  updateClientDetails,
} from "@/lib/actions/clients";
import type { InviteStatus } from "@/lib/inviteStatus";
import type { Client, ModuleKey } from "@/types/database";
import { MODULE_KEYS } from "@/types/database";

export function ClientRow({
  client,
  projects,
  inviteStatus,
}: {
  client: Client;
  projects: { id: string; name: string; clientIds: string[] }[];
  inviteStatus?: InviteStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(client.name);
  const [, startTransition] = useTransition();
  const [resending, setResending] = useState(false);
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const permCount = MODULE_KEYS.filter((k) => client.permissions[k]).length;
  const linkedProjects = projects.filter((p) => p.clientIds.includes(client.id));
  const avatarColor = colorForKey(client.name);

  const run = (fn: () => Promise<void>) => {
    startTransition(() => {
      fn().catch((err) => alert(err instanceof Error ? err.message : "Er ging iets mis."));
    });
  };

  const resend = async () => {
    setResending(true);
    setCopied(false);
    try {
      const link = await resendClientInvite(client.id);
      setResendLink(link);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Opnieuw uitnodigen mislukt.");
    } finally {
      setResending(false);
    }
  };

  const copyLink = async () => {
    if (!resendLink) return;
    try {
      await navigator.clipboard.writeText(resendLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // negeren — link staat gewoon zichtbaar om handmatig te kopiëren
    }
  };

  return (
    <div className={"access-item client-row" + (expanded ? " expanded" : "")}>
      <button type="button" className="access-summary" onClick={() => setExpanded((v) => !v)}>
        <span className="access-avatar" style={{ background: avatarColor, color: readableTextColor(avatarColor) }}>
          {(client.name || "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="access-summary-main">
          <span className="access-summary-name">{client.name}</span>
          <span className="access-summary-sub">
            {permCount}/{MODULE_KEYS.length} onderdelen zichtbaar · {linkedProjects.length} project
            {linkedProjects.length === 1 ? "" : "en"}
            {inviteStatus?.pending && <span className="stamp stamp-open" style={{ marginLeft: 8 }}>Uitnodiging niet geaccepteerd</span>}
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

          {inviteStatus?.pending && (
            <div className="hint-bar small">
              Uitnodiging nog niet geaccepteerd door {inviteStatus.email || "deze klant"} — de link kan verlopen zijn.
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <button type="button" className="btn-ghost" disabled={resending} onClick={resend}>
                  <RefreshCw size={13} /> {resending ? "Bezig…" : "Opnieuw uitnodigen"}
                </button>
                {resendLink && (
                  <>
                    <input value={resendLink} readOnly onFocus={(e) => e.target.select()} style={{ minWidth: 220 }} />
                    <button type="button" className="btn-ghost" onClick={copyLink}>
                      <Copy size={13} /> {copied ? "Gekopieerd!" : "Kopieer link"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

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
                const full = !checked && otherCount >= 2;
                return (
                  <label key={p.id} className={"checkbox-label" + (full ? " disabled" : "")}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={full}
                      onChange={() => run(() => setClientProject(client.id, p.id, !checked))}
                    />
                    {p.name}
                    {otherCount > 0 && (
                      <span className="access-summary-sub">
                        {" "}
                        — {full ? "vol, al gekoppeld aan 2 klanten" : `ook gekoppeld aan 1 andere klant`}
                      </span>
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
