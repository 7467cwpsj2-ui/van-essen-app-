import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/siteUrl";
import { CalendarFeedCard } from "@/components/CalendarFeedCard";

export default async function AccountPage() {
  const current = await requireUser();
  // Voor team-rollen is dit het eigen profiel; een eigenaar die zichzelf
  // als eigen personeel heeft toegevoegd (migratie 0061) gebruikt hier
  // diezelfde staff-koppeling.
  const myStaffId = current.profile.role === "team" ? current.profile.team_member_id : current.ownStaffMember?.id ?? null;

  let calendarFeedUrl: string | null = null;
  if (myStaffId) {
    const supabase = createClient();
    const { data: staffRow } = await supabase.from("team_members").select("calendar_token").eq("id", myStaffId).maybeSingle();
    if (staffRow?.calendar_token) {
      calendarFeedUrl = `${siteUrl()}/api/agenda/${staffRow.calendar_token}`;
    }
  }

  return (
    <div className="panel">
      <div className="header-eyebrow">Account</div>
      <h1 className="page-title">Mijn account</h1>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <span>Wachtwoord</span>
        </div>
        <Link href="/account/wachtwoord" className="btn-ghost" style={{ alignSelf: "flex-start" }}>
          <KeyRound size={14} /> Wachtwoord wijzigen
        </Link>
      </div>

      {myStaffId && <CalendarFeedCard initialUrl={calendarFeedUrl} />}
    </div>
  );
}
