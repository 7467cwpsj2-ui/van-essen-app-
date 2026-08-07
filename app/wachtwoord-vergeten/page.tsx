import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brandmark large">
          <div className="brandmark-name">
            <span className="bm-van">VAN</span> <span className="bm-essen">ESSEN</span>
          </div>
          <div className="bm-sub">BOUW &amp; ONDERHOUD</div>
        </div>
        <div className="login-title">
          <KeyRound size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Wachtwoord vergeten
        </div>
        {searchParams.sent ? (
          <>
            <p className="login-copy">
              Staat dit e-mailadres bij ons geregistreerd? Dan ontvang je binnen een paar minuten een e-mail met een link om
              een nieuw wachtwoord te kiezen. Geen mail gezien? Check ook je spam-map.
            </p>
            <div className="login-hint">
              <Link href="/login">Terug naar inloggen</Link>
            </div>
          </>
        ) : (
          <>
            <p className="login-copy">
              Vul je e-mailadres in — we sturen je een link om een nieuw wachtwoord te kiezen.
            </p>
            <form className="login-form" action={requestPasswordReset}>
              <input type="email" name="email" placeholder="E-mailadres" autoComplete="username" required />
              {searchParams.error && <div className="login-error">{searchParams.error}</div>}
              <button type="submit" className="btn-primary">
                Verstuur resetlink
              </button>
            </form>
            <div className="login-hint">
              <Link href="/login">Terug naar inloggen</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
