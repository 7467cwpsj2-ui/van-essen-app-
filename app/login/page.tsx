import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { LoginSubmitButton } from "@/components/LoginSubmitButton";
import { KeyRound } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
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
          Inloggen
        </div>
        <p className="login-copy">
          Log in met het e-mailadres en wachtwoord dat je van Van Essen Bouw &amp; Onderhoud hebt ontvangen.
        </p>
        <form className="login-form" action={signIn}>
          <input type="hidden" name="next" value={searchParams.next || "/dashboard"} />
          <input type="email" name="email" placeholder="E-mailadres" autoComplete="username" required />
          <input type="password" name="password" placeholder="Wachtwoord" autoComplete="current-password" required />
          {searchParams.error && <div className="login-error">{searchParams.error}</div>}
          <LoginSubmitButton />
        </form>
        <div className="login-hint">
          <Link href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link>
        </div>
        <div className="login-hint">
          Nog geen account? Vraag een uitnodiging aan bij de eigenaar van je project.
        </div>
      </div>
    </div>
  );
}
