import { requireOwner } from "@/lib/auth";
import { InvoiceUploadPanel } from "@/components/InvoiceUploadPanel";

export default async function FacturenPage() {
  await requireOwner();
  return <InvoiceUploadPanel />;
}
