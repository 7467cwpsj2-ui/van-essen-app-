"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { updateGoogleReviewUrl, updateLeadReminderDays } from "@/lib/actions/settings";

export function SettingsForm({ googleReviewUrl, leadReminderDays }: { googleReviewUrl: string; leadReminderDays: number }) {
  const [url, setUrl] = useState(googleReviewUrl);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const [days, setDays] = useState(String(leadReminderDays));
  const [daysSaved, setDaysSaved] = useState(false);
  const [daysPending, startDaysTransition] = useTransition();

  const save = () => {
    setSaved(false);
    startTransition(() => {
      updateGoogleReviewUrl(url)
        .then(() => setSaved(true))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  const saveDays = () => {
    setDaysSaved(false);
    startDaysTransition(() => {
      updateLeadReminderDays(Number(days) || 3)
        .then(() => setDaysSaved(true))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <>
      <div className="add-form">
        <div className="add-form-title">Automatische review-aanvraag</div>
        <label className="field-with-label">
          <span className="field-label">Link naar je Google-reviewpagina</span>
          <input
            placeholder="https://g.page/r/....../review"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <div className="hint-bar small">
          Zodra een opleverdossier ondertekend wordt, krijgt de klant 3 dagen later automatisch een pushmelding met deze link — mits
          die hieronder is ingevuld en de klant pushmeldingen heeft aanstaan. Leeg laten = geen automatisch verzoek.
        </div>
        <button className="btn-primary" onClick={save} disabled={pending} style={{ alignSelf: "flex-start" }}>
          <Save size={14} /> {pending ? "Bezig…" : "Opslaan"}
        </button>
        {saved && <div className="hint-bar small">Opgeslagen.</div>}
      </div>

      <div className="add-form">
        <div className="add-form-title">Offerte-herinnering</div>
        <label className="field-with-label">
          <span className="field-label">Aantal dagen na een locatiebezoek</span>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              setDaysSaved(false);
            }}
          />
        </label>
        <div className="hint-bar small">
          Heb je na dit aantal dagen nog geen offerte verstuurd voor een aanvraag, dan krijg je een pushmelding — en daarna elke
          zoveel dagen opnieuw, totdat je de status aanpast bij Offertes.
        </div>
        <button className="btn-primary" onClick={saveDays} disabled={daysPending} style={{ alignSelf: "flex-start" }}>
          <Save size={14} /> {daysPending ? "Bezig…" : "Opslaan"}
        </button>
        {daysSaved && <div className="hint-bar small">Opgeslagen.</div>}
      </div>
    </>
  );
}
