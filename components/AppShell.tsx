"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarRange,
  Calculator,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  Leaf,
  Plus,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Menu,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { AppBadgeUpdater } from "@/components/AppBadgeUpdater";
import { Brandmark } from "@/components/Brandmark";
import { NotificationBell } from "@/components/NotificationBell";
import { BottomSheetSwipeHandler } from "@/components/BottomSheetSwipeHandler";
import { PendingPushNavigator } from "@/components/PendingPushNavigator";
import { ProjectThumb } from "@/components/ProjectThumb";
import { PushPrompt } from "@/components/PushPrompt";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UpdateChecker } from "@/components/UpdateChecker";
import { signOut } from "@/lib/actions/auth";
import { haptic } from "@/lib/haptics";
import type { AppNotification, ProjectStatus, Role } from "@/types/database";

export interface SidebarProject {
  id: string;
  name: string;
  status: ProjectStatus;
  clientName: string | null;
  progress: number;
  coverPhotoUrl: string | null;
  planningColor: string | null;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};
const STATUSES: ProjectStatus[] = ["gepland", "lopend", "afgerond"];

export function AppShell({
  role,
  name,
  projects,
  notifications,
  openTaskCount,
  canSeePlanningOverzicht,
  hasOwnPlanning,
  children,
}: {
  role: Role;
  name: string;
  projects: SidebarProject[];
  notifications: { items: AppNotification[]; unreadCount: number };
  openTaskCount: number;
  canSeePlanningOverzicht: boolean;
  hasOwnPlanning: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const badgeCount = notifications.unreadCount + openTaskCount;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ afgerond: true });

  const toggleGroup = (status: string) => setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const roleLabel = { eigenaar: "Eigenaar", team: "Team", klant: "Klant" }[role];

  // Vaste kern van 2-4 meest gebruikte plekken, voor de tabbalk onderin
  // op mobiel — daarnaast blijft de volledige zijbalk via "Menu"
  // bereikbaar, dit is puur een snelkoppeling voor het dagelijkse werk.
  const planningHref =
    role === "eigenaar" || (role === "team" && canSeePlanningOverzicht)
      ? "/planning-overzicht"
      : hasOwnPlanning
        ? "/mijn-planning"
        : null;
  const tabs: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { href: "/dashboard", label: "Start", icon: LayoutDashboard },
    ...(role === "eigenaar" || role === "team" ? [{ href: "/uren", label: "Uren", icon: Clock }] : []),
    ...(planningHref ? [{ href: planningHref, label: "Planning", icon: CalendarRange }] : []),
    { href: "/meldingen", label: "Meldingen", icon: Bell, badge: notifications.unreadCount },
  ];
  const isTabActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Lichte trilling bij elke tik op een knop/link, app-breed — alleen
  // voelbaar op toestellen die de Vibration API ondersteunen.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest("button:not(:disabled), a[href]");
      if (target) haptic("light");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Op mobiel duwt het toetsenbord de vaste tabbalk onderin anders
  // gewoon mee omhoog, waar hij dan los boven het toetsenbord blijft
  // hangen — niet nodig en oogt rommelig. visualViewport-resize bleek
  // in de geïnstalleerde app (standalone PWA op iOS) niet betrouwbaar:
  // daar schuift het layout-viewport soms gewoon mee, waardoor er nooit
  // een meetbaar verschil ontstaat. Focus op een tekstveld is het
  // rechtstreekse signaal dat het toetsenbord open moet staan, dus
  // daarop wordt nu gestuurd; een korte vertraging bij het wegvallen
  // voorkomt geflicker als de focus binnen de balk zelf verspringt.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const isTextInput = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === "TEXTAREA") return true;
      if (el.tagName === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"].includes(type);
      }
      return false;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!isTextInput(e.target)) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      setKeyboardOpen(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!isTextInput(e.target)) return;
      hideTimer = setTimeout(() => setKeyboardOpen(false), 150);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <Link href="/dashboard" className="mobile-bar-brand" onClick={() => setSidebarOpen(false)}>
          <Brandmark />
        </Link>
        <ThemeToggle />
      </div>

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div className="sidebar-top">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
            <Brandmark />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell items={notifications.items} unreadCount={notifications.unreadCount} />
            <ThemeToggle />
          </div>
        </div>
        <div className="sidebar-section-label">Overzicht</div>
        <Link
          href="/dashboard"
          className={"toegang-toggle" + (pathname === "/dashboard" ? " active" : "")}
          onClick={() => setSidebarOpen(false)}
        >
          <LayoutDashboard size={14} /> Dashboard
        </Link>
        {(role === "eigenaar" || role === "team") && (
          <Link
            href="/uren"
            className={"toegang-toggle" + (pathname.startsWith("/uren") ? " active" : "")}
            onClick={() => setSidebarOpen(false)}
          >
            <Clock size={14} /> Uren registreren
          </Link>
        )}
        {hasOwnPlanning && (
          <Link
            href="/mijn-planning"
            className={"toegang-toggle" + (pathname === "/mijn-planning" ? " active" : "")}
            onClick={() => setSidebarOpen(false)}
          >
            <CalendarRange size={14} /> Mijn planning
          </Link>
        )}
        {role === "team" && canSeePlanningOverzicht && (
          <Link
            href="/planning-overzicht"
            className={"toegang-toggle" + (pathname === "/planning-overzicht" ? " active" : "")}
            onClick={() => setSidebarOpen(false)}
          >
            <CalendarRange size={14} /> Algemene planning
          </Link>
        )}
        {role === "eigenaar" && (
          <>
            <div className="sidebar-section-label">Werk</div>
            <Link href="/projects/new" className="new-project-toggle" onClick={() => setSidebarOpen(false)}>
              <Plus size={14} /> Nieuw project
            </Link>
            <Link
              href="/offertes"
              className={"toegang-toggle" + (pathname === "/offertes" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <ClipboardList size={14} /> Offertes
            </Link>
            <Link
              href="/planning-overzicht"
              className={"toegang-toggle" + (pathname === "/planning-overzicht" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <CalendarRange size={14} /> Algemene planning
            </Link>
            <div className="sidebar-section-label">Beheer</div>
            <Link
              href="/personeel"
              className={"toegang-toggle" + (pathname === "/personeel" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <Users size={14} /> Personeel
            </Link>
            <Link
              href="/clients"
              className={"toegang-toggle" + (pathname === "/clients" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <ShieldCheck size={14} /> Klanten
            </Link>
            <Link
              href="/facturen"
              className={"toegang-toggle" + (pathname === "/facturen" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText size={14} /> Facturen
            </Link>
            <Link
              href="/nacalculatie"
              className={"toegang-toggle" + (pathname === "/nacalculatie" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <Calculator size={14} /> Nacalculatie
            </Link>
            <Link
              href="/subsidies"
              className={"toegang-toggle" + (pathname === "/subsidies" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <Leaf size={14} /> Subsidies
            </Link>
            <Link
              href="/instellingen"
              className={"toegang-toggle" + (pathname === "/instellingen" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings size={14} /> Instellingen
            </Link>
          </>
        )}

        <div className="project-list">
          {projects.length === 0 && <div className="empty-hint">Nog geen projecten.</div>}
          {role === "klant"
            ? projects.map((p) => {
                const active = pathname.startsWith(`/projects/${p.id}`);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/planning`}
                    className={"project-item" + (active ? " active" : "")}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="project-item-thumb">
                      <ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planningColor} />
                    </div>
                    <div className="project-item-info">
                      <span className="project-item-name">{p.name}</span>
                      <span className="project-item-sub">{p.clientName || "geen klant gekoppeld"}</span>
                      <div className="project-item-progress">
                        <div className="project-item-progress-fill" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })
            : STATUSES.map((status) => {
                const groupProjects = projects.filter((p) => p.status === status);
                if (projects.length > 0 && groupProjects.length === 0) return null;
                const isCollapsed = !!collapsed[status];
                return (
                  <div key={status} className="project-group">
                    <button type="button" className="project-group-header" onClick={() => toggleGroup(status)}>
                      <ChevronDown size={13} className={"access-chevron" + (isCollapsed ? "" : " open")} />
                      <span>{STATUS_LABEL[status]}</span>
                      <span className="count-badge">{groupProjects.length}</span>
                    </button>
                    {!isCollapsed &&
                      groupProjects.map((p) => {
                        const active = pathname.startsWith(`/projects/${p.id}`);
                        return (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}/planning`}
                            className={"project-item" + (active ? " active" : "")}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <div className="project-item-thumb">
                              <ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planningColor} />
                            </div>
                            <div className="project-item-info">
                              <span className="project-item-name">{p.name}</span>
                              <span className="project-item-sub">{p.clientName || "geen klant gekoppeld"}</span>
                              <div className="project-item-progress">
                                <div className="project-item-progress-fill" style={{ width: `${p.progress}%` }} />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                  </div>
                );
              })}
        </div>

        {(role === "eigenaar" || role === "team") && (
          <Link
            href="/account"
            className={"toegang-toggle" + (pathname === "/account" ? " active" : "")}
            onClick={() => setSidebarOpen(false)}
          >
            <User size={14} /> Mijn account
          </Link>
        )}
        <Link
          href="/installeren"
          className={"toegang-toggle" + (pathname === "/installeren" ? " active" : "")}
          onClick={() => setSidebarOpen(false)}
        >
          <Smartphone size={14} /> App installeren
        </Link>

        <div className="sidebar-user">
          <div>
            <div className="sidebar-user-name">{name}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="logout-btn"
              onClick={() => {
                navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_NAV_CACHE" });
                (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
              }}
            >
              <LogOut size={12} /> Uit
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <AppBadgeUpdater count={badgeCount} />
        <BottomSheetSwipeHandler />
        <PendingPushNavigator />
        <UpdateChecker />
        <PushPrompt />
        {children}
      </main>

      <nav className={"bottom-tabbar" + (keyboardOpen ? " keyboard-open" : "")}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={"bottom-tab" + (active ? " active" : "")}>
              <span className="bottom-tab-icon">
                <Icon size={20} />
                {!!tab.badge && <span className="bottom-tab-badge">{tab.badge > 9 ? "9+" : tab.badge}</span>}
              </span>
              {tab.label}
            </Link>
          );
        })}
        <button type="button" className={"bottom-tab" + (sidebarOpen ? " active" : "")} onClick={() => setSidebarOpen((v) => !v)}>
          <span className="bottom-tab-icon">{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</span>
          Menu
        </button>
      </nav>
    </div>
  );
}
