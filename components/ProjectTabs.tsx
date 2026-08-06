"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CalendarRange,
  Image as ImageIcon,
  Camera,
  Euro,
  MessageCircle,
  MessageSquare,
  ClipboardCheck,
  Palette,
  Archive,
  Lock,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { ModuleKey } from "@/types/database";

const TAB_META: Record<ModuleKey, { icon: React.ReactNode; label: string }> = {
  planning: { icon: <ClipboardList size={14} />, label: "Te doen" },
  bouwplanning: { icon: <CalendarRange size={14} />, label: "Bouwplanning" },
  tekeningen: { icon: <ImageIcon size={14} />, label: "Tekeningen" },
  fotos: { icon: <Camera size={14} />, label: "Foto's" },
  meerwerk: { icon: <Euro size={14} />, label: "Meer-/minderwerk" },
  chat: { icon: <MessageCircle size={14} />, label: "Chat" },
  notities: { icon: <MessageSquare size={14} />, label: "Notities" },
  opleverpunten: { icon: <ClipboardCheck size={14} />, label: "Opleverpunten" },
  klantkeuzes: { icon: <Palette size={14} />, label: "Klantkeuzes" },
  dossier: { icon: <Archive size={14} />, label: "Opleverdossier" },
};

const TAB_ORDER: ModuleKey[] = [
  "planning",
  "bouwplanning",
  "tekeningen",
  "fotos",
  "notities",
  "chat",
  "opleverpunten",
  "klantkeuzes",
  "meerwerk",
  "dossier",
];

// Tabs die geen module-toggle hebben (harde regels of eigenaar-only),
// dus buiten het permissiesysteem om apart worden bepaald.
interface ExtraTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
}

export function ProjectTabs({
  projectId,
  visibleTabs,
  showPrivateChat,
  showHours,
  showCalc,
}: {
  projectId: string;
  visibleTabs: ModuleKey[];
  showPrivateChat: boolean;
  showHours: boolean;
  showCalc: boolean;
}) {
  const pathname = usePathname();

  const extraTabs: ExtraTab[] = [
    { key: "uren", label: "Uren", icon: <Clock size={14} />, visible: showHours },
    { key: "nacalculatie", label: "Nacalculatie", icon: <TrendingUp size={14} />, visible: showCalc },
    { key: "privechat", label: "Klant & eigenaar", icon: <Lock size={14} />, visible: showPrivateChat },
  ];

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
      {extraTabs
        .filter((t) => t.visible)
        .map((t) => {
          const href = `/projects/${projectId}/${t.key}`;
          const active = pathname.startsWith(href);
          return (
            <Link key={t.key} href={href} className={"tab-btn" + (active ? " active" : "")}>
              {t.icon} {t.label}
            </Link>
          );
        })}
    </div>
  );
}
