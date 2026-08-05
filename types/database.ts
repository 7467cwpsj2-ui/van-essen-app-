// Handgeschreven types die het schema in supabase/migrations/0001_init.sql
// volgen. Bij schemawijzigingen: hier bijwerken (of vervangen door
// `supabase gen types typescript` zodra er een gekoppeld project is).

export type Role = "eigenaar" | "team" | "klant";

export type ModuleKey = "planning" | "bouwplanning" | "tekeningen" | "fotos" | "meerwerk";

export const MODULE_KEYS: ModuleKey[] = ["planning", "bouwplanning", "tekeningen", "fotos", "meerwerk"];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  planning: "Planning",
  bouwplanning: "Bouwplanning",
  tekeningen: "Tekeningen",
  fotos: "Foto's",
  meerwerk: "Meer-/minderwerk",
};

export type Permissions = Record<ModuleKey, boolean>;

export const defaultPermissions = (): Permissions => ({
  planning: true,
  bouwplanning: true,
  tekeningen: true,
  fotos: true,
  meerwerk: true,
});

export type ProjectStatus = "gepland" | "lopend" | "afgerond";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  team_member_id: string | null;
  client_id: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  trade: string | null;
  permissions: Permissions;
  can_edit_schedule: boolean;
  sees_all_projects: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  permissions: Permissions;
  can_edit_schedule: boolean;
  created_at: string;
}

export interface ProjectTeamAccess {
  project_id: string;
  team_member_id: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string | null;
  address: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
}

export interface SchedulePhase {
  id: string;
  project_id: string;
  title: string;
  assignee: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  assignee: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export type FileType = "image" | "pdf";

export interface Drawing {
  id: string;
  project_id: string;
  title: string;
  note: string | null;
  file_path: string | null;
  file_type: FileType | null;
  uploader_id: string | null;
  uploaded_by: string | null;
  uploader_role: Role | null;
  team_visible: boolean;
  client_visible: boolean;
  reviewed: boolean;
  created_at: string;
}

export type PhotoCategory = "voor" | "tijdens" | "na" | "oplevering";

export interface Photo {
  id: string;
  project_id: string;
  title: string;
  category: PhotoCategory;
  note: string | null;
  file_path: string | null;
  file_type: FileType | null;
  uploader_id: string | null;
  uploaded_by: string | null;
  uploader_role: Role | null;
  team_visible: boolean;
  client_visible: boolean;
  reviewed: boolean;
  created_at: string;
}

export type ExtraWorkType = "meerwerk" | "minderwerk";
export type ExtraWorkStatus = "open" | "akkoord" | "afgewezen";

export interface ExtraWork {
  id: string;
  project_id: string;
  type: ExtraWorkType;
  description: string;
  amount: number;
  status: ExtraWorkStatus;
  explanation: string | null;
  extra_days: number | null;
  phase_id: string | null;
  schedule_cutoff: string | null;
  schedule_applied: boolean;
  approved_by: string | null;
  approved_date: string | null;
  rejected_by: string | null;
  rejected_date: string | null;
  signature_path: string | null;
  created_by: string | null;
  created_at: string;
}
