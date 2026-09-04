export const PROJECT_TYPES = [
  "personal",
  "client",
  "design",
  "development",
  "research",
  "business",
  "studio",
  "other",
] as const;

export const PROJECT_STATUSES = [
  "pitch",
  "negotiating",
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const PROJECT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export const COVER_MODES = ["none", "color", "gradient", "image"] as const;
export const LINK_TYPES = [
  "figma",
  "github",
  "notion",
  "google_drive",
  "website",
  "behance",
  "reference",
  "custom",
] as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];
export type CoverMode = (typeof COVER_MODES)[number];
export type LinkType = (typeof LINK_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type ProjectTaskRecord = {
  id: string;
  projectId: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMilestoneRecord = {
  id: string;
  projectId: string;
  title: string;
  targetDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentRecord = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectActivityRecord = {
  id: string;
  projectId: string;
  type: string;
  metadataJson: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  status: string;
  priority: string | null;
  clientName: string | null;
  startDate: string | null;
  deadline: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  workProgress: number;
  color: string | null;
  coverMode: string;
  coverImagePath: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  tags: string[];
  links: Array<{ id: string; type: string; title: string; url: string }>;
  tasks: ProjectTaskRecord[];
  milestones: ProjectMilestoneRecord[];
  documents: ProjectDocumentRecord[];
};

export type ProjectWorkspaceRecord = {
  project: ProjectRecord;
  activity: ProjectActivityRecord[];
};

export type ProjectActionResult = {
  ok: boolean;
  error?: string;
};
