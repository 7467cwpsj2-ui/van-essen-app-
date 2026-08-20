import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectClientName } from "@/lib/clientNames";
import type { ClientChoice, CompanyDetails, CompletionPoint, Drawing, ExtraWork, Photo, PhotoCategory, Project, WarrantyItem } from "@/types/database";

export interface DossierPhoto {
  id: string;
  title: string;
  url: string | null;
}

export interface DossierDrawing {
  id: string;
  title: string;
  url: string | null;
  fileType: string | null;
}

export interface DossierWarrantyItem extends WarrantyItem {
  certificateUrl: string | null;
}

export interface DossierData {
  project: Project;
  clientName: string | null;
  completionPoints: CompletionPoint[];
  extraWork: ExtraWork[];
  warrantyItems: DossierWarrantyItem[];
  photosByCategory: Record<PhotoCategory, DossierPhoto[]>;
  clientChoices: ClientChoice[];
  drawings: DossierDrawing[];
  signatureUrl: string | null;
  reviewUrl: string | null;
  coverPhotoUrl: string | null;
  company: CompanyDetails;
}

// Eén centrale plek om alle gegevens voor het opleverdossier op te
// halen — gebruikt door zowel het scherm, de PDF-export als de
// deelbare publieke link, zodat die drie nooit uit de pas kunnen lopen.
// `supabase` mag zowel een gewone sessie-client zijn (scherm/PDF, met
// RLS) als de service-role admin-client (de publieke link, zonder
// sessie) — de aanroeper regelt de autorisatie zelf.
//
// `restrictToClientVisible` moet `true` zijn zodra er geen sessie is
// (de publieke link): normaal filtert de RLS-policy van foto's/tekeningen
// automatisch op `reviewed && client_visible` voor een klant-rol, maar de
// service-role admin-client omzeilt RLS volledig — zonder deze losse
// filter zou de publieke link ook nog niet-goedgekeurd materiaal tonen.
export async function loadDossierData(
  supabase: SupabaseClient,
  projectId: string,
  urlTtlSeconds = 3600,
  restrictToClientVisible = false
): Promise<DossierData | null> {
  let photosQuery = supabase
    .from("photos")
    .select("*")
    .eq("project_id", projectId)
    .in("category", ["voor", "tijdens", "na", "oplevering"]);
  let drawingsQuery = supabase.from("drawings").select("*").eq("project_id", projectId).eq("client_visible", true);
  if (restrictToClientVisible) {
    photosQuery = photosQuery.eq("reviewed", true).eq("client_visible", true);
    drawingsQuery = drawingsQuery.eq("reviewed", true);
  }

  const [
    { data: project },
    { data: completionPoints },
    { data: extraWork },
    { data: warrantyItems },
    { data: photos },
    { data: clientChoices },
    { data: drawings },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("completion_points").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("extra_work").select("*").eq("project_id", projectId).eq("status", "akkoord"),
    supabase.from("warranty_items").select("*").eq("project_id", projectId).order("created_at"),
    photosQuery,
    supabase.from("client_choices").select("*").eq("project_id", projectId).eq("status", "gekozen").order("category"),
    drawingsQuery.order("created_at"),
  ]);

  if (!project) return null;
  const p = project as Project;

  const clientName = await getProjectClientName(supabase, projectId, p.client_id);

  const photosByCategory: Record<PhotoCategory, DossierPhoto[]> = { voor: [], tijdens: [], na: [], oplevering: [] };
  for (const ph of (photos ?? []) as Photo[]) {
    let url: string | null = null;
    if (ph.file_path) {
      const { data } = await supabase.storage.from("project-files").createSignedUrl(ph.file_path, urlTtlSeconds);
      url = data?.signedUrl ?? null;
    }
    photosByCategory[ph.category].push({ id: ph.id, title: ph.title, url });
  }
  // Voor/tijdens/na is een verhaal, geen onbeperkt archief — een ruime
  // grens (was 8) zodat het dossier écht uitgebreid kan zijn zonder dat
  // een project met honderden foto's de PDF onwerkbaar traag maakt.
  for (const cat of ["voor", "tijdens", "na"] as const) {
    photosByCategory[cat] = photosByCategory[cat].slice(0, 40);
  }

  let coverPhotoUrl: string | null = null;
  if (p.cover_photo_path) {
    const { data } = await supabase.storage.from("project-files").createSignedUrl(p.cover_photo_path, urlTtlSeconds);
    coverPhotoUrl = data?.signedUrl ?? null;
  }
  if (!coverPhotoUrl) {
    coverPhotoUrl = photosByCategory.oplevering[0]?.url ?? photosByCategory.na[0]?.url ?? null;
  }

  const drawingData: DossierDrawing[] = await Promise.all(
    ((drawings ?? []) as Drawing[]).map(async (d) => {
      let url: string | null = null;
      if (d.file_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(d.file_path, urlTtlSeconds);
        url = data?.signedUrl ?? null;
      }
      return { id: d.id, title: d.title, url, fileType: d.file_type };
    })
  );

  const warrantyData: DossierWarrantyItem[] = await Promise.all(
    ((warrantyItems ?? []) as WarrantyItem[]).map(async (w) => {
      let certificateUrl: string | null = null;
      if (w.certificate_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(w.certificate_path, urlTtlSeconds);
        certificateUrl = data?.signedUrl ?? null;
      }
      return { ...w, certificateUrl };
    })
  );

  let signatureUrl: string | null = null;
  if (p.delivery_signature_path) {
    const { data } = await supabase.storage.from("project-files").createSignedUrl(p.delivery_signature_path, urlTtlSeconds);
    signatureUrl = data?.signedUrl ?? null;
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("app_settings")
    .select("google_review_url,company_name,company_kvk,company_address,company_postal_city,company_phone,company_email")
    .eq("id", true)
    .single();

  return {
    project: p,
    clientName,
    completionPoints: (completionPoints ?? []) as CompletionPoint[],
    extraWork: (extraWork ?? []) as ExtraWork[],
    warrantyItems: warrantyData,
    photosByCategory,
    clientChoices: (clientChoices ?? []) as ClientChoice[],
    drawings: drawingData,
    signatureUrl,
    reviewUrl: (settings?.google_review_url as string | null | undefined) ?? null,
    coverPhotoUrl,
    company: {
      company_name: (settings?.company_name as string | undefined) ?? "Van Essen Bouw & Onderhoud",
      company_kvk: (settings?.company_kvk as string | null | undefined) ?? null,
      company_address: (settings?.company_address as string | null | undefined) ?? null,
      company_postal_city: (settings?.company_postal_city as string | null | undefined) ?? null,
      company_phone: (settings?.company_phone as string | null | undefined) ?? null,
      company_email: (settings?.company_email as string | null | undefined) ?? null,
    },
  };
}
