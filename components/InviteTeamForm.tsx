"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, Plus } from "lucide-react";
import { inviteTeamMember } from "@/lib/actions/team";
import { MODULE_KEYS, MODULE_LABELS } from "@/types/database";

export function InviteTeamForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = (formData: FormData) => {
    setError("");
    setInviteLink(null);
    setCopied(false);
    startTransition(() => {
      inviteTeamMember(formData)
        .then((link) => {
          formRef.current?.reset();
          if (link) setInviteLink(link);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Uitnodigen mislukt."));
    });
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // negeren — link staat gewoon zichtbaar om handmatig te kopiëren
    }
  };

  return (
    <form ref={formRef} action={submit} className="add-form">
      <div className="add-form-title">Teamlid uitnodigen</div>
      <div className="add-form-grid">
        <input name="name" placeholder="Naam / bedrijf" required />
        <input name="email" type="email" placeholder="E-mailadres" required />
        <input name="trade" placeholder="Vak (optioneel)" />
      </div>
      <div className="radio-row">
        <label className="checkbox-label">
          <input type="radio" name="member_type" value="personeel" />
          Eigen personeel (Van Essen Bouw &amp; Onderhoud)
        </label>
        <label className="checkbox-label">
          <input type="radio" name="member_type" value="onderaannemer" defaultChecked />
          Team / onderaannemer
        </label>
      </div>
      <div className="hint-bar small">Kies meteen wat dit teamlid mag zien — je kunt dit later altijd nog aanpassen.</div>
      <div className="perm-grid">
        {MODULE_KEYS.map((key) => (
          <label key={key} className="perm-checkbox">
            <input type="checkbox" name={`perm_${key}`} defaultChecked />
            {MODULE_LABELS[key]}
          </label>
        ))}
      </div>
      <button type="submit" className="btn-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> {pending ? "Bezig…" : "Uitnodigen"}
      </button>
      {error && <div className="login-error">{error}</div>}
      {inviteLink && (
        <div className="hint-bar small">
          Teamlid toegevoegd. Er wordt geen automatische e-mail meer verstuurd (die liep vast door e-mailbeveiliging) — stuur
          deze link zelf door, bijvoorbeeld via WhatsApp of sms:
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <input value={inviteLink} readOnly onFocus={(e) => e.target.select()} style={{ minWidth: 220 }} />
            <button type="button" className="btn-ghost" onClick={copyLink}>
              <Copy size={13} /> {copied ? "Gekopieerd!" : "Kopieer link"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
