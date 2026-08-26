"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, Copy, X } from "lucide-react";
import { getOrCreateCalendarFeedUrl, revokeCalendarFeed } from "@/lib/actions/calendarFeed";

export function CalendarFeedCard({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const generate = async () => {
    setBusy(true);
    try {
      const link = await getOrCreateCalendarFeedUrl();
      setUrl(link);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Aanmaken mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // negeren — link staat gewoon zichtbaar om handmatig te kopiëren
    }
  };

  const revoke = () => {
    if (!confirm("Agenda-koppeling intrekken? De link stopt dan met werken in je agenda-app.")) return;
    startTransition(() => {
      revokeCalendarFeed()
        .then(() => setUrl(null))
        .catch((err) => alert(err instanceof Error ? err.message : "Intrekken mislukt."));
    });
  };

  return (
    <div className="dash-panel">
      <div className="dash-panel-head">
        <span>Agenda-koppeling</span>
      </div>
      {url ? (
        <>
          <div className="hint-bar small">
            Voeg deze link toe als &ldquo;agenda abonneren&rdquo; in je telefoon (Google Agenda, Apple Agenda, Outlook) — je
            ingeplande klussen en projecten verschijnen dan vanzelf, ook zonder de app te openen.
          </div>
          <div className="access-row">
            <input value={url} readOnly onFocus={(e) => e.target.select()} />
            <button type="button" className="btn-ghost" onClick={copy}>
              <Copy size={13} /> {copied ? "Gekopieerd!" : "Kopieer"}
            </button>
          </div>
          <button type="button" className="icon-btn danger ghost" style={{ alignSelf: "flex-start" }} onClick={revoke} title="Intrekken">
            <X size={13} /> Koppeling intrekken
          </button>
        </>
      ) : (
        <>
          <div className="empty-hint small empty-hint-row">
            <span className="empty-hint-icon-chip">
              <Calendar size={13} />
            </span>
            Nog geen agenda-koppeling ingesteld.
          </div>
          <button type="button" className="btn-primary" disabled={busy} onClick={generate} style={{ alignSelf: "flex-start" }}>
            {busy ? "Bezig…" : (
              <>
                <Check size={14} /> Link genereren
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
