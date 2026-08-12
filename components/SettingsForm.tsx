"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { updateGoogleReviewUrl } from "@/lib/actions/settings";

export function SettingsForm({ googleReviewUrl }: { googleReviewUrl: string }) {
  const [url, setUrl] = useState(googleReviewUrl);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setSaved(false);
    startTransition(() => {
      updateGoogleReviewUrl(url)
        .then(() => setSaved(true))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
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
  );
}
