"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, MoreVertical, Share, Smartphone } from "lucide-react";

type Platform = "ios" | "android" | "other";

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");
  }, []);

  return (
    <div className="dashboard">
      <div className="header-eyebrow">Welkom</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase" }}>
        Zet de app op je beginscherm
      </h1>
      <div className="hint-bar">
        Dit hoef je maar één keer te doen. Daarna open je Van Essen Bouw &amp; Onderhoud voortaan als een gewone app, met een
        eigen icoon — geen adresbalk of omweg via de mail nodig.
      </div>

      {(platform === "ios" || platform === "other") && (
        <div className="install-card">
          <div className="install-card-title">
            <Smartphone size={16} /> Op de iPhone / iPad (Safari)
          </div>
          <div className="install-step">
            <div className="install-step-num">1</div>
            <div className="install-step-text">
              Open deze pagina in <b>Safari</b> — niet in de Mail-app of een andere app.
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">2</div>
            <div className="install-step-text">
              Tik onderin op het deel-icoon <Share size={13} style={{ display: "inline", verticalAlign: -2 }} />.
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">3</div>
            <div className="install-step-text">
              Scroll naar beneden en tik op <b>&ldquo;Zet op beginscherm&rdquo;</b>.
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">4</div>
            <div className="install-step-text">
              Tik rechtsboven op <b>&ldquo;Voeg toe&rdquo;</b>. Klaar — het icoon staat nu op je beginscherm.
            </div>
          </div>
        </div>
      )}

      {(platform === "android" || platform === "other") && (
        <div className="install-card">
          <div className="install-card-title">
            <Smartphone size={16} /> Op Android (Chrome)
          </div>
          <div className="install-step">
            <div className="install-step-num">1</div>
            <div className="install-step-text">
              Tik rechtsboven op het menu <MoreVertical size={13} style={{ display: "inline", verticalAlign: -2 }} />.
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">2</div>
            <div className="install-step-text">
              Tik op <b>&ldquo;App installeren&rdquo;</b> of <b>&ldquo;Toevoegen aan startscherm&rdquo;</b>.
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">3</div>
            <div className="install-step-text">Bevestig. Klaar — het icoon staat nu op je startscherm.</div>
          </div>
        </div>
      )}

      <Link href="/dashboard" className="btn-primary" style={{ width: "fit-content" }}>
        <LayoutDashboard size={14} /> Naar het dashboard
      </Link>
    </div>
  );
}
