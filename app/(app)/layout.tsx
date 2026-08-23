import { requireUser } from "@/lib/auth";
import { getNotifications, getProjectsWithProgress, getUnreadDirectMessageCount } from "@/lib/data";
import { AppShell, type SidebarProject } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await requireUser();
  const [projects, notifications, unreadMessages] = await Promise.all([
    getProjectsWithProgress(),
    getNotifications(),
    getUnreadDirectMessageCount(current.profile.role),
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
      unreadMessages={unreadMessages}
    >
      {children}
    </AppShell>
  );
}
