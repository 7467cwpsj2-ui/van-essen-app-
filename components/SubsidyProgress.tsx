import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SUBSIDY_APPLICATION_STATUS_LABEL } from "@/types/database";
import type { SubsidyApplicationStatus } from "@/types/database";

type StepState = "done" | "pending" | "todo";

function Step({ label, state, detail }: { label: string; state: StepState; detail?: string }) {
  const icon =
    state === "done" ? (
      <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
    ) : state === "pending" ? (
      <Clock size={15} style={{ color: "var(--warning)", flexShrink: 0 }} />
    ) : (
      <Circle size={15} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
    );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span>{label}</span>
      {detail && <span className="access-summary-sub">— {detail}</span>}
    </div>
  );
}

export function SubsidyProgress({
  itemsCount,
  itemsWithoutAttachmentCount,
  authorizationStatus,
  applicationStatus,
}: {
  itemsCount: number;
  itemsWithoutAttachmentCount: number;
  authorizationStatus: "geen" | "wacht_op_klant" | "ondertekend";
  applicationStatus: SubsidyApplicationStatus | null;
}) {
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      <div className="add-form-title">Voortgang</div>
      <Step
        label="Maatregelen toegevoegd"
        state={itemsCount > 0 ? "done" : "todo"}
        detail={itemsCount > 0 ? `${itemsCount} maatregel${itemsCount === 1 ? "" : "en"}` : "nog geen maatregelen"}
      />
      <Step
        label="Machtiging"
        state={authorizationStatus === "ondertekend" ? "done" : authorizationStatus === "wacht_op_klant" ? "pending" : "todo"}
        detail={
          authorizationStatus === "ondertekend"
            ? "ondertekend door klant"
            : authorizationStatus === "wacht_op_klant"
            ? "wacht op ondertekening klant"
            : "nog niet aangevraagd"
        }
      />
      <Step
        label="Bewijsfoto's / bijlagen"
        state={itemsCount === 0 ? "todo" : itemsWithoutAttachmentCount === 0 ? "done" : "pending"}
        detail={
          itemsCount === 0
            ? "eerst maatregelen toevoegen"
            : itemsWithoutAttachmentCount > 0
            ? `${itemsWithoutAttachmentCount} maatregel${itemsWithoutAttachmentCount === 1 ? "" : "en"} zonder bijlage`
            : "compleet"
        }
      />
      <Step
        label="Aanvraag bij RVO"
        state={
          applicationStatus === "goedgekeurd" || applicationStatus === "uitbetaald"
            ? "done"
            : applicationStatus && applicationStatus !== "concept"
            ? "pending"
            : "todo"
        }
        detail={applicationStatus ? SUBSIDY_APPLICATION_STATUS_LABEL[applicationStatus] : "nog niet ingediend"}
      />
    </div>
  );
}
