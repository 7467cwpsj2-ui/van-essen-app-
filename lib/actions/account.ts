"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(formData: FormData) {
  await requireUser();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const onboarding = String(formData.get("onboarding") || "");
  const onboardingSuffix = onboarding ? "&onboarding=1" : "";

  if (password.length < 8) {
    redirect(`/account/wachtwoord?error=${encodeURIComponent("Kies een wachtwoord van minimaal 8 tekens.")}${onboardingSuffix}`);
  }
  if (password !== confirm) {
    redirect(`/account/wachtwoord?error=${encodeURIComponent("De wachtwoorden komen niet overeen.")}${onboardingSuffix}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/account/wachtwoord?error=${encodeURIComponent(error.message)}${onboardingSuffix}`);
  }

  redirect(onboarding ? "/installeren" : "/dashboard");
}
