"use client";

import { ProjectNumberEditor } from "@/components/ProjectNumberEditor";
import { updateQuickJobExternalRefs, updateQuickJobNumber } from "@/lib/actions/quickJobs";

// Dunne client-wrapper zodat de (server-)detailpagina van een losse
// klus de generieke ProjectNumberEditor kan gebruiken zonder zelf
// closures over server actions als prop door te moeten geven (dat kan
// niet over de RSC-grens heen) — zie EditProjectButton voor het
// zelfde patroon bij een project.
export function QuickJobNumberPanel({
  jobId,
  year,
  sequence,
  offerNumber,
  invoiceNumbers,
}: {
  jobId: string;
  year: number | null;
  sequence: number | null;
  offerNumber: string | null;
  invoiceNumbers: string[];
}) {
  return (
    <ProjectNumberEditor
      year={year}
      sequence={sequence}
      offerNumber={offerNumber}
      invoiceNumbers={invoiceNumbers}
      onSaveNumber={(y, seq) => updateQuickJobNumber(jobId, y, seq)}
      onSaveRefs={(data) => updateQuickJobExternalRefs(jobId, data)}
    />
  );
}
