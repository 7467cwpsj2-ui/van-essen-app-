import { requireUser } from "@/lib/auth";
import { getNotifications, getOpenTaskCount, getProjectsWithProgress } from "@/lib/data";
import { AppShell, type SidebarProject } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await requireUser();
  const [projects, notifications, openTaskCount] = await Promise.all([
    getProjectsWithProgress(),
    getNotifications(),
    getOpenTaskCount(),
  ]);

  const sidebarProjects: SidebarProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    clientName: p.clientName,
    progress: p.progress,
    coverPhotoUrl: p.coverPhotoUrl,
    planningColor: p.planning_color,
  }));

  return (
    <AppShell
      role={current.profile.role}
      name={current.profile.name}
      projects={sidebarProjects}
      notifications={notifications}
      openTaskCount={openTaskCount}
    >
      {children}
    </AppShell>
  );
}
