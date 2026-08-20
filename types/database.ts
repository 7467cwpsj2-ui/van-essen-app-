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
  planning: "Te doen",
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

export const TASK_ASSIGNEE_LABEL: Record<TaskAssigneeType, string> = {
  eigenaar: "Jou",
  team: "Team",
  klant: "Klant",
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

export type TeamMemberType = "personeel" | "onderaannemer";

export interface TeamMember {
  id: string;
  name: string;
  trade: string | null;
  permissions: Permissions;
  can_edit_schedule: boolean;
  sees_all_projects: boolean;
  member_type: TeamMemberType;
  hourly_rate: number | null;
  hourly_rate_vat_type: ExtraWorkVatType;
  created_at: string;
}

export interface CostItem {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  vat_type: ExtraWorkVatType;
  supplier: string | null;
  invoice_number: string | null;
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
  quote_vat_type: ExtraWorkVatType;
  delivery_ready: boolean;
  delivery_date: string | null;
  warranty_text: string | null;
  delivery_signed_at: string | null;
  delivery_signed_by: string | null;
  delivery_signature_path: string | null;
  actual_cost: number;
  cover_photo_path: string | null;
  planning_color: string | null;
  review_request_sent_at: string | null;
  dossier_share_token: string | null;
  hidden_tabs: string[];
}

export interface SchedulePhase {
  id: string;
  project_id: string;
  title: string;
  assignee: string | null;
  assignee_team_member_ids: string[];
  start_date: string;
  end_date: string;
  fixed_date: boolean;
  created_at: string;
}

export interface QuickJob {
  id: string;
  title: string;
  assignee: string | null;
  assignee_team_member_ids: string[];
  start_date: string;
  end_date: string;
  created_at: string;
}

export type TaskAssigneeType = "eigenaar" | "team" | "klant";

export interface Task {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  assignee: string | null;
  assignee_type: TaskAssigneeType;
  assignee_team_member_ids: string[];
  due_date: string | null;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
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
export type ExtraWorkVatType = "excl" | "incl";

export const VAT_TYPE_LABEL: Record<ExtraWorkVatType, string> = { excl: "excl. btw", incl: "incl. btw" };

// Standaard hoge btw-tarief, gebruikt om een incl.-btw uurtarief
// automatisch om te rekenen naar excl. btw voor de nacalculatie.
export const STANDARD_VAT_RATE = 0.21;

export function amountExclVat(amount: number, vatType: ExtraWorkVatType): number {
  return vatType === "incl" ? amount / (1 + STANDARD_VAT_RATE) : amount;
}

export interface ExtraWork {
  id: string;
  project_id: string;
  type: ExtraWorkType;
  description: string;
  amount: number;
  vat_type: ExtraWorkVatType;
  status: ExtraWorkStatus;
  explanation: string | null;
  photo_path: string | null;
  file_type: "image" | "pdf" | null;
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

export type NoteVisibility = "prive" | "team" | "klant" | "alleen_klant";

export interface Note {
  id: string;
  project_id: string;
  text: string;
  author_id: string | null;
  author_name: string | null;
  visibility: NoteVisibility;
  visible_team_member_ids: string[];
  reviewed: boolean;
  created_at: string;
}

export type CompletionPointStatus = "nieuw" | "open" | "gereed" | "goedgekeurd";

export interface CompletionPoint {
  id: string;
  project_id: string;
  description: string;
  note: string | null;
  responsible_team_member_id: string | null;
  responsible_name: string | null;
  deadline: string | null;
  status: CompletionPointStatus;
  photo_path: string | null;
  file_type: "image" | "pdf" | null;
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
export type WarrantyType = "eigen" | "fabrikant";

export const WARRANTY_TYPE_LABEL: Record<WarrantyType, string> = {
  eigen: "Eigen garantie Van Essen Bouw & Onderhoud",
  fabrikant: "Fabrieksgarantie",
};

export interface WarrantyItem {
  id: string;
  project_id: string;
  item: string;
  amount: number;
  unit: WarrantyUnit;
  warranty_type: WarrantyType;
  manufacturer: string | null;
  start_date: string | null;
  certificate_path: string | null;
  certificate_file_type: FileType | null;
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
  file_path: string | null;
  file_type: "image" | "pdf" | null;
  created_at: string;
}

export type LeadStatus = "open" | "offerte_verzonden" | "gewonnen" | "verloren";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  open: "Open",
  offerte_verzonden: "Offerte verzonden",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

export interface Lead {
  id: string;
  client_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  visit_date: string | null;
  status: LeadStatus;
  converted_project_id: string | null;
  last_reminder_sent_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
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

export interface SubsidyProduct {
  id: string;
  category: string;
  measure: string;
  manufacturer: string | null;
  product_name: string;
  type: string | null;
  meldcode: string | null;
  unit: string;
  subsidy_amount: number;
  valid_from: string | null;
  valid_to: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface SubsidyCheckItem {
  id: string;
  project_id: string;
  product_id: string | null;
  category: string;
  measure: string;
  manufacturer: string | null;
  product_name: string;
  type: string | null;
  meldcode: string | null;
  quantity: number;
  unit: string;
  amount_per_unit: number;
  indicative_subsidy: number;
  execution_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SubsidyCheckItemPhoto {
  id: string;
  check_item_id: string;
  project_id: string;
  file_path: string;
  file_type: FileType;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type SubsidyAuthorizationScope = "aanvraag" | "aanvraag_beheer" | "aanvraag_beheer_bezwaar";
export type SubsidyAuthorizationStatus = "wacht_op_klant" | "ondertekend";

export const SUBSIDY_AUTHORIZATION_SCOPE_LABEL: Record<SubsidyAuthorizationScope, string> = {
  aanvraag: "de aanvraag indienen",
  aanvraag_beheer: "de aanvraag indienen en beheren",
  aanvraag_beheer_bezwaar: "de aanvraag indienen, beheren en eventueel bezwaar maken",
};

export interface SubsidyAuthorization {
  id: string;
  project_id: string;
  scope: SubsidyAuthorizationScope;
  status: SubsidyAuthorizationStatus;
  requested_by: string | null;
  requested_at: string;
  client_signature_path: string | null;
  client_signed_by: string | null;
  client_signed_at: string | null;
  created_at: string;
}

export interface CompanyDetails {
  company_name: string;
  company_kvk: string | null;
  company_address: string | null;
  company_postal_city: string | null;
  company_phone: string | null;
  company_email: string | null;
}

export type SubsidyApplicationStatus =
  | "concept"
  | "ingediend"
  | "in_behandeling"
  | "aanvullende_info_gevraagd"
  | "goedgekeurd"
  | "afgewezen"
  | "uitbetaald";

export const SUBSIDY_APPLICATION_STATUS_ORDER: SubsidyApplicationStatus[] = [
  "concept",
  "ingediend",
  "in_behandeling",
  "aanvullende_info_gevraagd",
  "goedgekeurd",
  "afgewezen",
  "uitbetaald",
];

export const SUBSIDY_APPLICATION_STATUS_LABEL: Record<SubsidyApplicationStatus, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  in_behandeling: "In behandeling bij RVO",
  aanvullende_info_gevraagd: "Aanvullende informatie gevraagd",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
  uitbetaald: "Subsidie ontvangen",
};

export interface SubsidyApplication {
  id: string;
  project_id: string;
  status: SubsidyApplicationStatus;
  application_number: string | null;
  submitted_at: string | null;
  decision_amount: number | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
