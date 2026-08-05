import { setPassword } from "@/lib/actions/account";

export default function SetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="panel" style={{ maxWidth: 380 }}>
      <div className="header-eyebrow">Welkom</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: "0 0 4px", textTransform: "uppercase" }}>
        Kies je wachtwoord
      </h1>
      <p className="login-copy" style={{ textAlign: "left" }}>
        Stel een wachtwoord in om voortaan zelf in te loggen.
      </p>
      <form action={setPassword} className="add-form">
        <input type="password" name="password" placeholder="Nieuw wachtwoord" autoComplete="new-password" required minLength={8} />
        <input type="password" name="confirm" placeholder="Herhaal wachtwoord" autoComplete="new-password" required minLength={8} />
        {searchParams.error && <div className="login-error">{searchParams.error}</div>}
        <button type="submit" className="btn-primary">
          Opslaan en doorgaan
        </button>
      </form>
    </div>
  );
}
