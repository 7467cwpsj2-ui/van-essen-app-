"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarRange, Image as ImageIcon, Camera, Euro } from "lucide-react";
import type { ModuleKey } from "@/types/database";

const TAB_META: Record<ModuleKey, { icon: React.ReactNode; label: string }> = {
  planning: { icon: <ClipboardList size={14} />, label: "Planning" },
  bouwplanning: { icon: <CalendarRange size={14} />, label: "Bouwplanning" },
  tekeningen: { icon: <ImageIcon size={14} />, label: "Tekeningen" },
  fotos: { icon: <Camera size={14} />, label: "Foto's" },
  meerwerk: { icon: <Euro size={14} />, label: "Meer-/minderwerk" },
};

const TAB_ORDER: ModuleKey[] = ["planning", "bouwplanning", "tekeningen", "fotos", "meerwerk"];

export function ProjectTabs({ projectId, visibleTabs }: { projectId: string; visibleTabs: ModuleKey[] }) {
  const pathname = usePathname();
  return (
    <div className="tabs">
      {TAB_ORDER.filter((t) => visibleTabs.includes(t)).map((key) => {
        const href = `/projects/${projectId}/${key}`;
        const active = pathname.startsWith(href);
        return (
          <Link key={key} href={href} className={"tab-btn" + (active ? " active" : "")}>
            {TAB_META[key].icon} {TAB_META[key].label}
          </Link>
        );
      })}
    </div>
  );
}
