import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectClientName } from "@/lib/clientNames";
import type { CompanyDetails, Project, SubsidyAuthorization } from "@/types/database";

export interface AuthorizationData {
  project: Project;
  clientName: string | null;
  company: CompanyDetails;
  authorization: SubsidyAuthorization | null;
  signatureUrl: string | null;
}

// Eén centrale plek om alles voor de machtiging op te halen — gebruikt
// door zowel het scherm als de PDF-export.
export async function loadAuthorizationData(
  supabase: SupabaseClient,
  projectId: string,
  urlTtlSeconds = 3600
): Promise<AuthorizationData | null> {
  const [{ data: project }, { data: authorization }, { data: settings }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("subsidy_authorizations").select("*").eq("project_id", projectId).maybeSingle(),
    supabase
      .from("app_settings")
      .select("company_name,company_kvk,company_address,company_postal_city,company_phone,company_email")
      .eq("id", true)
      .single(),
  ]);
  if (!project) return null;
  const p = project as Project;
  const clientName = await getProjectClientName(supabase, projectId, p.client_id);
  const auth = (authorization as SubsidyAuthorization | null) ?? null;

  let signatureUrl: string | null = null;
  if (auth?.client_signature_path) {
    const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(auth.client_signature_path, urlTtlSeconds);
    signatureUrl = signed?.signedUrl ?? null;
  }

  return {
    project: p,
    clientName,
    company: (settings as CompanyDetails | null) ?? {
      company_name: "Van Essen Bouw & Onderhoud",
      company_kvk: null,
      company_address: null,
      company_postal_city: null,
      company_phone: null,
      company_email: null,
    },
    authorization: auth,
    signatureUrl,
  };
}
