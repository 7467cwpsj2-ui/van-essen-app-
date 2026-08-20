"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { updateCompanyDetails, updateGoogleReviewUrl, updateLeadReminderDays } from "@/lib/actions/settings";

export function SettingsForm({
  googleReviewUrl,
  leadReminderDays,
  companyName,
  companyKvk,
  companyAddress,
  companyPostalCity,
  companyPhone,
  companyEmail,
}: {
  googleReviewUrl: string;
  leadReminderDays: number;
  companyName: string;
  companyKvk: string;
  companyAddress: string;
  companyPostalCity: string;
  companyPhone: string;
  companyEmail: string;
}) {
  const [url, setUrl] = useState(googleReviewUrl);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const [days, setDays] = useState(String(leadReminderDays));
  const [daysSaved, setDaysSaved] = useState(false);
  const [daysPending, startDaysTransition] = useTransition();

  const [company, setCompany] = useState({
    companyName,
    companyKvk,
    companyAddress,
    companyPostalCity,
    companyPhone,
    companyEmail,
  });
  const [companySaved, setCompanySaved] = useState(false);
  const [companyPending, startCompanyTransition] = useTransition();

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

  const saveCompany = () => {
    setCompanySaved(false);
    startCompanyTransition(() => {
      updateCompanyDetails(company)
        .then(() => setCompanySaved(true))
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

      <div className="add-form">
        <div className="add-form-title">Bedrijfsgegevens</div>
        <div className="hint-bar small">
          Gebruikt als &quot;gemachtigde&quot; op het ISDE-machtigingsformulier en op andere officiële documenten uit de app.
        </div>
        <div className="add-form-grid">
          <input
            placeholder="Bedrijfsnaam"
            value={company.companyName}
            onChange={(e) => {
              setCompany({ ...company, companyName: e.target.value });
              setCompanySaved(false);
            }}
          />
          <input
            placeholder="KVK-nummer"
            value={company.companyKvk}
            onChange={(e) => {
              setCompany({ ...company, companyKvk: e.target.value });
              setCompanySaved(false);
            }}
          />
          <input
            placeholder="Adres"
            value={company.companyAddress}
            onChange={(e) => {
              setCompany({ ...company, companyAddress: e.target.value });
              setCompanySaved(false);
            }}
          />
          <input
            placeholder="Postcode en plaats"
            value={company.companyPostalCity}
            onChange={(e) => {
              setCompany({ ...company, companyPostalCity: e.target.value });
              setCompanySaved(false);
            }}
          />
          <input
            placeholder="Telefoonnummer"
            value={company.companyPhone}
            onChange={(e) => {
              setCompany({ ...company, companyPhone: e.target.value });
              setCompanySaved(false);
            }}
          />
          <input
            placeholder="E-mailadres"
            value={company.companyEmail}
            onChange={(e) => {
              setCompany({ ...company, companyEmail: e.target.value });
              setCompanySaved(false);
            }}
          />
        </div>
        <button className="btn-primary" onClick={saveCompany} disabled={companyPending} style={{ alignSelf: "flex-start" }}>
          <Save size={14} /> {companyPending ? "Bezig…" : "Opslaan"}
        </button>
        {companySaved && <div className="hint-bar small">Opgeslagen.</div>}
      </div>
    </>
  );
}
