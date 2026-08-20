import { notFound } from "next/navigation";
import { canSeeSubsidies, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubsidyCheckPanel } from "@/components/SubsidyCheckPanel";
import type { Project, SubsidyCheckItem, SubsidyProduct } from "@/types/database";

export default async function SubsidiePage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeSubsidies(current)) notFound();

  const supabase = createClient();
  const [{ data: products }, { data: items }, { data: project }] = await Promise.all([
    supabase.from("subsidy_products").select("*").eq("active", true).order("category").order("measure"),
    supabase.from("subsidy_check_items").select("*").eq("project_id", params.id).order("created_at"),
    supabase.from("projects").select("name,delivery_signed_at").eq("id", params.id).single(),
  ]);

  return (
    <SubsidyCheckPanel
      projectId={params.id}
      projectName={(project as Pick<Project, "name" | "delivery_signed_at"> | null)?.name ?? "project"}
      isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
      products={(products ?? []) as SubsidyProduct[]}
      items={(items ?? []) as SubsidyCheckItem[]}
    />
  );
}
