import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export default async function InstellingenPage() {
  await requireOwner();
  const supabase = createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("google_review_url,lead_reminder_days,company_name,company_kvk,company_address,company_postal_city,company_phone,company_email")
    .eq("id", true)
    .single();

  return (
    <div className="panel">
      <div className="hint-bar">Algemene instellingen voor de app.</div>
      <SettingsForm
        googleReviewUrl={data?.google_review_url ?? ""}
        leadReminderDays={data?.lead_reminder_days ?? 3}
        companyName={data?.company_name ?? "Van Essen Bouw & Onderhoud"}
        companyKvk={data?.company_kvk ?? ""}
        companyAddress={data?.company_address ?? ""}
        companyPostalCity={data?.company_postal_city ?? ""}
        companyPhone={data?.company_phone ?? ""}
        companyEmail={data?.company_email ?? ""}
      />
    </div>
  );
}
