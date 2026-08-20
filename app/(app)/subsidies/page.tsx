import { Leaf } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubsidyProductsPanel } from "@/components/SubsidyProductsPanel";
import type { SubsidyProduct } from "@/types/database";

export default async function SubsidiesPage() {
  await requireOwner();
  const supabase = createClient();
  const { data: products } = await supabase.from("subsidy_products").select("*").order("category").order("measure");

  return (
    <div>
      <div className="hint-bar" style={{ marginBottom: 16 }}>
        <Leaf size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Beheer hier de RVO-meldcodes en subsidiebedragen voor de ISDE-regeling. Dit is een indicatie op basis van de gegevens die je
        hier invoert — controleer bedragen en meldcodes regelmatig op rvo.nl en werk ze hier bij.
      </div>
      <SubsidyProductsPanel products={(products ?? []) as SubsidyProduct[]} />
    </div>
  );
}
