import { requireOwner } from "@/lib/auth";
import { getNacalculatieOverview } from "@/lib/nacalculatie";
import { NacalculatieOverviewPanel } from "@/components/NacalculatieOverviewPanel";

export default async function NacalculatiePage() {
  await requireOwner();
  const rows = await getNacalculatieOverview();

  return (
    <div>
      <div className="header-eyebrow">Beheer</div>
      <h1 className="page-title">Nacalculatie</h1>
      <NacalculatieOverviewPanel rows={rows} />
    </div>
  );
}
