import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export default async function InstellingenPage() {
  await requireOwner();
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("google_review_url,lead_reminder_days").eq("id", true).single();

  return (
    <div className="panel">
      <div className="hint-bar">Algemene instellingen voor de app.</div>
      <SettingsForm googleReviewUrl={data?.google_review_url ?? ""} leadReminderDays={data?.lead_reminder_days ?? 3} />
    </div>
  );
}
