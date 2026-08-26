"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { Brandmark } from "@/components/Brandmark";
import { NotificationBell } from "@/components/NotificationBell";
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
  children,
}: {
  role: Role;
  name: string;
  projects: SidebarProject[];
  notifications: { items: AppNotification[]; unreadCount: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ afgerond: true });

  const toggleGroup = (status: string) => setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const roleLabel = { eigenaar: "Eigenaar", team: "Team", klant: "Klant" }[role];

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

  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <button type="button" className="mobile-menu-btn" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />} Menu
        </button>
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
          <Brandmark />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell items={notifications.items} unreadCount={notifications.unreadCount} />
          <ThemeToggle />
        </div>
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
              onClick={() => navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_NAV_CACHE" })}
            >
              <LogOut size={12} /> Uit
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <PendingPushNavigator />
        <UpdateChecker />
        <PushPrompt />
        {children}
      </main>
    </div>
  );
}
