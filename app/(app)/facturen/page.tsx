import { requireOwner } from "@/lib/auth";
import { InvoiceUploadPanel } from "@/components/InvoiceUploadPanel";

export default async function FacturenPage() {
  await requireOwner();
  return (
    <div>
      <div className="header-eyebrow">Beheer</div>
      <h1 className="page-title">Facturen</h1>
      <InvoiceUploadPanel />
    </div>
  );
}
