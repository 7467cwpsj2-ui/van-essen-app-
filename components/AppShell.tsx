"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Plus,
  Users,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Menu,
  Smartphone,
  X,
} from "lucide-react";
import { Brandmark } from "@/components/Brandmark";
import { PushPrompt } from "@/components/PushPrompt";
import { signOut } from "@/lib/actions/auth";
import type { ProjectStatus, Role } from "@/types/database";

export interface SidebarProject {
  id: string;
  name: string;
  status: ProjectStatus;
  clientName: string | null;
  progress: number;
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
  children,
}: {
  role: Role;
  name: string;
  projects: SidebarProject[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ afgerond: true });

  const toggleGroup = (status: string) => setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const roleLabel = { eigenaar: "Eigenaar", team: "Team", klant: "Klant" }[role];

  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <button type="button" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />} Menu
        </button>
        <Brandmark />
      </div>

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <Brandmark />
        <Link
          href="/dashboard"
          className={"toegang-toggle" + (pathname === "/dashboard" ? " active" : "")}
          onClick={() => setSidebarOpen(false)}
        >
          <LayoutDashboard size={14} /> Dashboard
        </Link>
        {role === "eigenaar" && (
          <>
            <Link href="/projects/new" className="new-project-toggle" onClick={() => setSidebarOpen(false)}>
              <Plus size={14} /> Nieuw project
            </Link>
            <Link
              href="/team"
              className={"toegang-toggle" + (pathname === "/team" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <Users size={14} /> Team
            </Link>
            <Link
              href="/clients"
              className={"toegang-toggle" + (pathname === "/clients" ? " active" : "")}
              onClick={() => setSidebarOpen(false)}
            >
              <ShieldCheck size={14} /> Klanten
            </Link>
          </>
        )}

        <div className="project-list">
          {projects.length === 0 && <div className="empty-hint">Nog geen projecten.</div>}
          {STATUSES.map((status) => {
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
                          <Building2 size={14} />
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
            <button type="submit" className="logout-btn">
              <LogOut size={12} /> Uit
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <PushPrompt />
        {children}
      </main>
    </div>
  );
}
