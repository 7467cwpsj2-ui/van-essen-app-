"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Leaf,
  FileSignature,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { updateHiddenTabs } from "@/lib/actions/projects";
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

interface TabCandidate {
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
  showSubsidies,
  showAuthorization,
  hiddenTabs,
  canCustomize,
}: {
  projectId: string;
  visibleTabs: ModuleKey[];
  showPrivateChat: boolean;
  showHours: boolean;
  showCalc: boolean;
  showSubsidies: boolean;
  showAuthorization: boolean;
  hiddenTabs: string[];
  canCustomize: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [customizing, setCustomizing] = useState(false);
  const [selection, setSelection] = useState<string[]>(hiddenTabs);
  const [pending, startTransition] = useTransition();
  const [jumpOpen, setJumpOpen] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jumpOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (jumpRef.current && !jumpRef.current.contains(e.target as Node)) setJumpOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [jumpOpen]);

  const candidates: TabCandidate[] = [
    ...TAB_ORDER.filter((t) => visibleTabs.includes(t)).map((key) => ({ key, label: TAB_META[key].label, icon: TAB_META[key].icon, visible: true })),
    { key: "uren", label: "Uren", icon: <Clock size={14} />, visible: showHours },
    { key: "nacalculatie", label: "Nacalculatie", icon: <TrendingUp size={14} />, visible: showCalc },
    { key: "subsidie", label: "Subsidie", icon: <Leaf size={14} />, visible: showSubsidies },
    { key: "machtiging", label: "Machtiging", icon: <FileSignature size={14} />, visible: showAuthorization },
    { key: "privechat", label: "Privéchat", icon: <Lock size={14} />, visible: showPrivateChat },
  ].filter((t) => t.visible);

  const shown = candidates.filter((t) => !hiddenTabs.includes(t.key));

  const openCustomize = () => {
    setSelection(hiddenTabs);
    setCustomizing(true);
  };

  const toggle = (key: string) => {
    setSelection((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const save = () => {
    startTransition(() => {
      updateHiddenTabs(projectId, selection)
        .then(() => {
          setCustomizing(false);
          router.refresh();
        })
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <>
      <div className="tabs-scroll-wrap">
        <div className="tabs">
          {shown.map((t) => {
            const href = `/projects/${projectId}/${t.key}`;
            const active = pathname.startsWith(href);
            return (
              <Link key={t.key} href={href} className={"tab-btn" + (active ? " active" : "")}>
                {t.icon} {t.label}
              </Link>
            );
          })}
        </div>
        <div className="tabs-pinned-actions">
          <div className="tabs-jump-wrap" ref={jumpRef}>
            <button
              type="button"
              className="tab-btn tab-btn-customize"
              onClick={() => setJumpOpen((v) => !v)}
              title="Alle tabs van dit project"
            >
              <ChevronDown size={14} className={jumpOpen ? "open" : ""} />
            </button>
            {jumpOpen && (
              <div className="route-menu-panel tabs-jump-panel">
                {shown.map((t) => {
                  const href = `/projects/${projectId}/${t.key}`;
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={t.key}
                      href={href}
                      onClick={() => setJumpOpen(false)}
                      className={"tabs-jump-row" + (active ? " active" : "")}
                    >
                      {t.icon} {t.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {canCustomize && (
            <button type="button" className="tab-btn tab-btn-customize" onClick={openCustomize} title="Tabs aanpassen">
              <SlidersHorizontal size={14} />
            </button>
          )}
        </div>
      </div>

      {customizing && (
        <div className="sig-overlay" onClick={() => !pending && setCustomizing(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Tabs voor dit project</div>
            <div className="hint-bar small">
              Vink uit wat hier niet nodig is — de pagina&apos;s zelf blijven gewoon bereikbaar, dit verbergt ze alleen uit de balk
              hierboven.
            </div>
            <div className="access-list" style={{ maxHeight: 320, overflowY: "auto" }}>
              {candidates.map((t) => (
                <label key={t.key} className="checkbox-label" style={{ padding: "6px 0" }}>
                  <input type="checkbox" checked={!selection.includes(t.key)} onChange={() => toggle(t.key)} />
                  {t.icon} {t.label}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setCustomizing(false)} disabled={pending}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={pending}>
                {pending ? "Bezig…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
