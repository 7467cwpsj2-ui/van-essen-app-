// Handgeschreven types die het schema in supabase/migrations/0001_init.sql
// volgen. Bij schemawijzigingen: hier bijwerken (of vervangen door
// `supabase gen types typescript` zodra er een gekoppeld project is).

export type Role = "eigenaar" | "team" | "klant";

export type ModuleKey =
  | "planning"
  | "bouwplanning"
  | "tekeningen"
  | "fotos"
  | "meerwerk"
  | "chat"
  | "notities"
  | "opleverpunten"
  | "klantkeuzes"
  | "dossier";

export const MODULE_KEYS: ModuleKey[] = [
  "planning",
  "bouwplanning",
  "tekeningen",
  "fotos",
  "meerwerk",
  "chat",
  "notities",
  "opleverpunten",
  "klantkeuzes",
  "dossier",
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  planning: "Planning",
  bouwplanning: "Bouwplanning",
  tekeningen: "Tekeningen",
  fotos: "Foto's",
  meerwerk: "Meer-/minderwerk",
  chat: "Chat",
  notities: "Notities",
  opleverpunten: "Opleverpunten",
  klantkeuzes: "Klantkeuzes",
  dossier: "Opleverdossier",
};

export type Permissions = Record<ModuleKey, boolean>;

export const defaultPermissions = (): Permissions => ({
  planning: true,
  bouwplanning: true,
  tekeningen: true,
  fotos: true,
  meerwerk: true,
  chat: true,
  notities: true,
  opleverpunten: true,
  klantkeuzes: true,
  dossier: true,
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
  quote_amount: number;
  delivery_ready: boolean;
  delivery_date: string | null;
  warranty_text: string | null;
  delivery_signed_at: string | null;
  delivery_signed_by: string | null;
  delivery_signature_path: string | null;
  actual_cost: number;
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

export type NoteVisibility = "prive" | "team" | "klant";

export interface Note {
  id: string;
  project_id: string;
  text: string;
  author_id: string | null;
  author_name: string | null;
  visibility: NoteVisibility;
  created_at: string;
}

export type CompletionPointStatus = "open" | "gereed" | "goedgekeurd";

export interface CompletionPoint {
  id: string;
  project_id: string;
  description: string;
  responsible_team_member_id: string | null;
  responsible_name: string | null;
  deadline: string | null;
  status: CompletionPointStatus;
  created_at: string;
}

export type ClientChoiceStatus = "open" | "gekozen" | "afgewezen";

export interface ClientChoice {
  id: string;
  project_id: string;
  category: string;
  description: string | null;
  deadline: string | null;
  status: ClientChoiceStatus;
  choice_text: string | null;
  decided_at: string | null;
  created_at: string;
}

export type WarrantyUnit = "weken" | "maanden" | "jaren";

export interface WarrantyItem {
  id: string;
  project_id: string;
  item: string;
  amount: number;
  unit: WarrantyUnit;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  author_id: string | null;
  author_name: string | null;
  text: string;
  created_at: string;
}

export interface OwnerClientMessage {
  id: string;
  project_id: string;
  author_id: string | null;
  author_name: string | null;
  text: string;
  created_at: string;
}

export interface HourEntry {
  id: string;
  project_id: string;
  team_member_id: string;
  work_date: string;
  hours: number;
  note: string | null;
  created_at: string;
}
