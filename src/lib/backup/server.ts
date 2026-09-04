import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { InferSelectModel } from "drizzle-orm";

import { getDataDirectory, getDatabase } from "@/lib/db/connection";
import {
  projectActivity,
  projectDocuments,
  projectLinks,
  projectMilestones,
  projects,
  projectStatusHistory,
  projectTags,
  projectTasks,
  projectTemplateDocuments,
  projectTemplateMilestones,
  projectTemplateTags,
  projectTemplateTasks,
  projectTemplates,
  settings,
  tags,
} from "@/lib/db/schema";
import { COVER_MODES, LINK_TYPES, PROJECT_PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES, TASK_STATUSES } from "@/lib/projects/types";

export const BACKUP_FORMAT = "local-project-os-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

type BackupData = {
  settings: InferSelectModel<typeof settings>[];
  projects: InferSelectModel<typeof projects>[];
  projectStatusHistory: InferSelectModel<typeof projectStatusHistory>[];
  projectLinks: InferSelectModel<typeof projectLinks>[];
  tags: InferSelectModel<typeof tags>[];
  projectTags: InferSelectModel<typeof projectTags>[];
  projectActivity: InferSelectModel<typeof projectActivity>[];
  projectTasks: InferSelectModel<typeof projectTasks>[];
  projectMilestones: InferSelectModel<typeof projectMilestones>[];
  projectDocuments: InferSelectModel<typeof projectDocuments>[];
  projectTemplates: InferSelectModel<typeof projectTemplates>[];
  projectTemplateTags: InferSelectModel<typeof projectTemplateTags>[];
  projectTemplateTasks: InferSelectModel<typeof projectTemplateTasks>[];
  projectTemplateMilestones: InferSelectModel<typeof projectTemplateMilestones>[];
  projectTemplateDocuments: InferSelectModel<typeof projectTemplateDocuments>[];
};

export type BackupDocument = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: BackupData;
  coverAssets: Array<{ path: string; contentBase64: string }>;
};

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactObject(value: unknown, keys: string[], name: string) {
  if (!isRecord(value) || Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) {
    throw new BackupValidationError(`${name} has an invalid shape.`);
  }
  return value;
}

function readArray(value: unknown, name: string) {
  if (!Array.isArray(value)) throw new BackupValidationError(`${name} must be an array.`);
  return value;
}

function string(value: unknown, name: string, maximum = 50_000) {
  if (typeof value !== "string" || !value || value.length > maximum) throw new BackupValidationError(`${name} is invalid.`);
  return value;
}

function nullableString(value: unknown, name: string, maximum = 50_000) {
  return value === null ? null : string(value, name, maximum);
}

function number(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new BackupValidationError(`${name} is invalid.`);
  return value;
}

function integer(value: unknown, name: string) {
  const parsed = number(value, name);
  if (!Number.isInteger(parsed)) throw new BackupValidationError(`${name} must be an integer.`);
  return parsed;
}

function boolean(value: unknown, name: string) {
  if (typeof value !== "boolean") throw new BackupValidationError(`${name} is invalid.`);
  return value;
}

function oneOf<T extends readonly string[]>(value: unknown, name: string, values: T): T[number] {
  const parsed = string(value, name, 64);
  if (!values.includes(parsed)) throw new BackupValidationError(`${name} is invalid.`);
  return parsed as T[number];
}

function calendarDate(value: unknown, name: string, nullable = true) {
  if (value === null && nullable) return null;
  const parsed = string(value, name, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsed);
  if (!match) throw new BackupValidationError(`${name} must use YYYY-MM-DD.`);
  const candidate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (candidate.getUTCFullYear() !== Number(match[1]) || candidate.getUTCMonth() !== Number(match[2]) - 1 || candidate.getUTCDate() !== Number(match[3])) {
    throw new BackupValidationError(`${name} must be a valid calendar date.`);
  }
  return parsed;
}

function timestamp(value: unknown, name: string, nullable = true) {
  if (value === null && nullable) return null;
  const parsed = string(value, name, 64);
  if (Number.isNaN(Date.parse(parsed))) throw new BackupValidationError(`${name} must be an ISO timestamp.`);
  return parsed;
}

function metadata(value: unknown, name: string) {
  const parsed = string(value, name, 50_000);
  try {
    JSON.parse(parsed);
  } catch {
    throw new BackupValidationError(`${name} must contain JSON.`);
  }
  return parsed;
}

function color(value: unknown, name: string) {
  const parsed = nullableString(value, name, 7);
  if (parsed && !/^#[0-9a-fA-F]{6}$/.test(parsed)) throw new BackupValidationError(`${name} is invalid.`);
  return parsed;
}

function coverPath(value: unknown, name: string) {
  const parsed = nullableString(value, name, 64);
  if (parsed && !/^covers\/[0-9a-f-]+\.(png|jpeg|gif|webp)$/.test(parsed)) throw new BackupValidationError(`${name} is invalid.`);
  return parsed;
}

function validUrl(value: unknown, name: string) {
  const parsed = string(value, name, 2_048);
  try {
    const url = new URL(parsed);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
  } catch {
    throw new BackupValidationError(`${name} must be an http(s) URL.`);
  }
  return parsed;
}

function uniqueIds(rows: Array<{ id: string }>, name: string) {
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new BackupValidationError(`${name} contains duplicate identifiers.`);
}

function assetBuffer(contentBase64: string, assetPath: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
    throw new BackupValidationError(`Cover asset ${assetPath} is not valid base64.`);
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_COVER_BYTES) throw new BackupValidationError(`Cover asset ${assetPath} exceeds the size limit.`);
  const extension = assetPath.split(".").pop();
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const gif = buffer.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/);
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!((extension === "png" && png) || (extension === "jpeg" && jpeg) || (extension === "gif" && gif) || (extension === "webp" && webp))) {
    throw new BackupValidationError(`Cover asset ${assetPath} does not match its file type.`);
  }
  return buffer;
}

function parseBackup(input: unknown): BackupDocument {
  const root = exactObject(input, ["format", "version", "exportedAt", "data", "coverAssets"], "Backup");
  if (root.format !== BACKUP_FORMAT) throw new BackupValidationError("This file is not a Local Project OS backup.");
  if (root.version !== BACKUP_VERSION) throw new BackupValidationError("This backup version is not supported.");
  const exportedAt = timestamp(root.exportedAt, "exportedAt", false)!;
  const data = exactObject(root.data, ["settings", "projects", "projectStatusHistory", "projectLinks", "tags", "projectTags", "projectActivity", "projectTasks", "projectMilestones", "projectDocuments", "projectTemplates", "projectTemplateTags", "projectTemplateTasks", "projectTemplateMilestones", "projectTemplateDocuments"], "Backup data");
  const rows = <T>(key: keyof BackupData, parser: (value: unknown) => T) => readArray(data[key], key).map(parser) as T[];

  const parsed: BackupData = {
    settings: rows("settings", (value) => { const row = exactObject(value, ["key", "valueJson"], "settings row"); metadata(row.valueJson, "settings.valueJson"); return { key: string(row.key, "settings.key", 100), valueJson: row.valueJson as string }; }),
    projects: rows("projects", (value) => { const row = exactObject(value, ["id", "name", "description", "type", "status", "priority", "clientName", "startDate", "deadline", "completedAt", "cancelledAt", "workProgress", "color", "coverMode", "coverImagePath", "sortOrder", "createdAt", "updatedAt", "archivedAt"], "project row"); const startDate = calendarDate(row.startDate, "project.startDate"); const deadline = calendarDate(row.deadline, "project.deadline"); if (startDate && deadline && deadline < startDate) throw new BackupValidationError("Project deadline precedes its start date."); const workProgress = integer(row.workProgress, "project.workProgress"); if (workProgress < 0 || workProgress > 100) throw new BackupValidationError("Project work progress is out of range."); return { id: string(row.id, "project.id", 128), name: string(row.name, "project.name", 160), description: nullableString(row.description, "project.description", 5_000), type: row.type === null ? null : oneOf(row.type, "project.type", PROJECT_TYPES), status: oneOf(row.status, "project.status", PROJECT_STATUSES), priority: row.priority === null ? null : oneOf(row.priority, "project.priority", PROJECT_PRIORITIES), clientName: nullableString(row.clientName, "project.clientName", 160), startDate, deadline, completedAt: timestamp(row.completedAt, "project.completedAt"), cancelledAt: timestamp(row.cancelledAt, "project.cancelledAt"), workProgress, color: color(row.color, "project.color"), coverMode: oneOf(row.coverMode, "project.coverMode", COVER_MODES), coverImagePath: coverPath(row.coverImagePath, "project.coverImagePath"), sortOrder: row.sortOrder === null ? null : number(row.sortOrder, "project.sortOrder"), createdAt: timestamp(row.createdAt, "project.createdAt", false)!, updatedAt: timestamp(row.updatedAt, "project.updatedAt", false)!, archivedAt: timestamp(row.archivedAt, "project.archivedAt") }; }),
    projectStatusHistory: rows("projectStatusHistory", (value) => { const row = exactObject(value, ["id", "projectId", "fromStatus", "toStatus", "changedAt"], "status history row"); return { id: string(row.id, "history.id", 128), projectId: string(row.projectId, "history.projectId", 128), fromStatus: row.fromStatus === null ? null : oneOf(row.fromStatus, "history.fromStatus", PROJECT_STATUSES), toStatus: oneOf(row.toStatus, "history.toStatus", PROJECT_STATUSES), changedAt: timestamp(row.changedAt, "history.changedAt", false)! }; }),
    projectLinks: rows("projectLinks", (value) => { const row = exactObject(value, ["id", "projectId", "type", "title", "url", "createdAt"], "link row"); return { id: string(row.id, "link.id", 128), projectId: string(row.projectId, "link.projectId", 128), type: oneOf(row.type, "link.type", LINK_TYPES), title: string(row.title, "link.title", 160), url: validUrl(row.url, "link.url"), createdAt: timestamp(row.createdAt, "link.createdAt", false)! }; }),
    tags: rows("tags", (value) => { const row = exactObject(value, ["id", "name", "createdAt"], "tag row"); return { id: string(row.id, "tag.id", 128), name: string(row.name, "tag.name", 48), createdAt: timestamp(row.createdAt, "tag.createdAt", false)! }; }),
    projectTags: rows("projectTags", (value) => { const row = exactObject(value, ["projectId", "tagId"], "project tag row"); return { projectId: string(row.projectId, "projectTag.projectId", 128), tagId: string(row.tagId, "projectTag.tagId", 128) }; }),
    projectActivity: rows("projectActivity", (value) => { const row = exactObject(value, ["id", "projectId", "type", "metadataJson", "createdAt"], "activity row"); return { id: string(row.id, "activity.id", 128), projectId: string(row.projectId, "activity.projectId", 128), type: string(row.type, "activity.type", 100), metadataJson: metadata(row.metadataJson, "activity.metadataJson"), createdAt: timestamp(row.createdAt, "activity.createdAt", false)! }; }),
    projectTasks: rows("projectTasks", (value) => { const row = exactObject(value, ["id", "projectId", "title", "detail", "status", "dueDate", "completedAt", "sortOrder", "createdAt", "updatedAt"], "task row"); return { id: string(row.id, "task.id", 128), projectId: string(row.projectId, "task.projectId", 128), title: string(row.title, "task.title", 240), detail: nullableString(row.detail, "task.detail", 5_000), status: oneOf(row.status, "task.status", TASK_STATUSES), dueDate: calendarDate(row.dueDate, "task.dueDate"), completedAt: timestamp(row.completedAt, "task.completedAt"), sortOrder: number(row.sortOrder, "task.sortOrder"), createdAt: timestamp(row.createdAt, "task.createdAt", false)!, updatedAt: timestamp(row.updatedAt, "task.updatedAt", false)! }; }),
    projectMilestones: rows("projectMilestones", (value) => { const row = exactObject(value, ["id", "projectId", "title", "targetDate", "completedAt", "createdAt", "updatedAt"], "milestone row"); return { id: string(row.id, "milestone.id", 128), projectId: string(row.projectId, "milestone.projectId", 128), title: string(row.title, "milestone.title", 240), targetDate: calendarDate(row.targetDate, "milestone.targetDate", false)!, completedAt: timestamp(row.completedAt, "milestone.completedAt"), createdAt: timestamp(row.createdAt, "milestone.createdAt", false)!, updatedAt: timestamp(row.updatedAt, "milestone.updatedAt", false)! }; }),
    projectDocuments: rows("projectDocuments", (value) => { const row = exactObject(value, ["id", "projectId", "title", "content", "createdAt", "updatedAt"], "document row"); return { id: string(row.id, "document.id", 128), projectId: string(row.projectId, "document.projectId", 128), title: string(row.title, "document.title", 240), content: typeof row.content === "string" && row.content.length <= 50_000 ? row.content : (() => { throw new BackupValidationError("document.content is invalid."); })(), createdAt: timestamp(row.createdAt, "document.createdAt", false)!, updatedAt: timestamp(row.updatedAt, "document.updatedAt", false)! }; }),
    projectTemplates: rows("projectTemplates", (value) => { const row = exactObject(value, ["id", "name", "description", "type", "status", "priority", "color", "isStarter", "createdAt", "updatedAt"], "template row"); return { id: string(row.id, "template.id", 128), name: string(row.name, "template.name", 160), description: nullableString(row.description, "template.description", 5_000), type: row.type === null ? null : oneOf(row.type, "template.type", PROJECT_TYPES), status: oneOf(row.status, "template.status", PROJECT_STATUSES), priority: row.priority === null ? null : oneOf(row.priority, "template.priority", PROJECT_PRIORITIES), color: color(row.color, "template.color"), isStarter: boolean(row.isStarter, "template.isStarter"), createdAt: timestamp(row.createdAt, "template.createdAt", false)!, updatedAt: timestamp(row.updatedAt, "template.updatedAt", false)! }; }),
    projectTemplateTags: rows("projectTemplateTags", (value) => { const row = exactObject(value, ["templateId", "name"], "template tag row"); return { templateId: string(row.templateId, "templateTag.templateId", 128), name: string(row.name, "templateTag.name", 48) }; }),
    projectTemplateTasks: rows("projectTemplateTasks", (value) => { const row = exactObject(value, ["id", "templateId", "title", "detail", "status", "dueOffsetDays", "sortOrder"], "template task row"); const dueOffsetDays = row.dueOffsetDays === null ? null : integer(row.dueOffsetDays, "templateTask.dueOffsetDays"); if (dueOffsetDays !== null && (dueOffsetDays < 0 || dueOffsetDays > 3660)) throw new BackupValidationError("templateTask.dueOffsetDays is invalid."); return { id: string(row.id, "templateTask.id", 128), templateId: string(row.templateId, "templateTask.templateId", 128), title: string(row.title, "templateTask.title", 240), detail: nullableString(row.detail, "templateTask.detail", 5_000), status: oneOf(row.status, "templateTask.status", TASK_STATUSES), dueOffsetDays, sortOrder: number(row.sortOrder, "templateTask.sortOrder") }; }),
    projectTemplateMilestones: rows("projectTemplateMilestones", (value) => { const row = exactObject(value, ["id", "templateId", "title", "targetOffsetDays", "sortOrder"], "template milestone row"); const targetOffsetDays = integer(row.targetOffsetDays, "templateMilestone.targetOffsetDays"); if (targetOffsetDays < 0 || targetOffsetDays > 3660) throw new BackupValidationError("templateMilestone.targetOffsetDays is invalid."); return { id: string(row.id, "templateMilestone.id", 128), templateId: string(row.templateId, "templateMilestone.templateId", 128), title: string(row.title, "templateMilestone.title", 240), targetOffsetDays, sortOrder: number(row.sortOrder, "templateMilestone.sortOrder") }; }),
    projectTemplateDocuments: rows("projectTemplateDocuments", (value) => { const row = exactObject(value, ["id", "templateId", "title", "content", "sortOrder"], "template document row"); return { id: string(row.id, "templateDocument.id", 128), templateId: string(row.templateId, "templateDocument.templateId", 128), title: string(row.title, "templateDocument.title", 240), content: typeof row.content === "string" && row.content.length <= 50_000 ? row.content : (() => { throw new BackupValidationError("templateDocument.content is invalid."); })(), sortOrder: number(row.sortOrder, "templateDocument.sortOrder") }; }),
  };

  uniqueIds(parsed.projects, "Projects"); uniqueIds(parsed.projectStatusHistory, "Status history"); uniqueIds(parsed.projectLinks, "Links"); uniqueIds(parsed.tags, "Tags"); uniqueIds(parsed.projectActivity, "Activity"); uniqueIds(parsed.projectTasks, "Tasks"); uniqueIds(parsed.projectMilestones, "Milestones"); uniqueIds(parsed.projectDocuments, "Documents"); uniqueIds(parsed.projectTemplates, "Templates"); uniqueIds(parsed.projectTemplateTasks, "Template tasks"); uniqueIds(parsed.projectTemplateMilestones, "Template milestones"); uniqueIds(parsed.projectTemplateDocuments, "Template documents");
  if (new Set(parsed.settings.map((row) => row.key)).size !== parsed.settings.length || new Set(parsed.tags.map((row) => row.name)).size !== parsed.tags.length) throw new BackupValidationError("Backup contains duplicate unique values.");
  const projectIds = new Set(parsed.projects.map((row) => row.id)); const tagIds = new Set(parsed.tags.map((row) => row.id)); const templateIds = new Set(parsed.projectTemplates.map((row) => row.id));
  for (const row of [...parsed.projectStatusHistory, ...parsed.projectLinks, ...parsed.projectActivity, ...parsed.projectTasks, ...parsed.projectMilestones, ...parsed.projectDocuments]) if (!projectIds.has(row.projectId)) throw new BackupValidationError("Backup contains a record for a missing Project.");
  for (const row of parsed.projectTags) if (!projectIds.has(row.projectId) || !tagIds.has(row.tagId)) throw new BackupValidationError("Backup contains an invalid Project tag relation.");
  if (new Set(parsed.projectTags.map((row) => `${row.projectId}:${row.tagId}`)).size !== parsed.projectTags.length) throw new BackupValidationError("Backup contains duplicate Project tag relations.");
  for (const row of [...parsed.projectTemplateTags, ...parsed.projectTemplateTasks, ...parsed.projectTemplateMilestones, ...parsed.projectTemplateDocuments]) if (!templateIds.has(row.templateId)) throw new BackupValidationError("Backup contains a record for a missing template.");
  if (new Set(parsed.projectTemplateTags.map((row) => `${row.templateId}:${row.name}`)).size !== parsed.projectTemplateTags.length) throw new BackupValidationError("Backup contains duplicate template tags.");

  const coverAssets = readArray(root.coverAssets, "coverAssets").map((value) => { const row = exactObject(value, ["path", "contentBase64"], "cover asset"); const assetPath = coverPath(row.path, "coverAsset.path"); if (!assetPath) throw new BackupValidationError("Cover asset path is required."); const contentBase64 = string(row.contentBase64, "coverAsset.contentBase64", Math.ceil(MAX_COVER_BYTES * 1.4)); assetBuffer(contentBase64, assetPath); return { path: assetPath, contentBase64 }; });
  const expectedCovers = new Set(parsed.projects.map((row) => row.coverImagePath).filter((value): value is string => Boolean(value)));
  if (new Set(coverAssets.map((asset) => asset.path)).size !== coverAssets.length || coverAssets.length !== expectedCovers.size || coverAssets.some((asset) => !expectedCovers.has(asset.path))) throw new BackupValidationError("Backup cover assets do not match Project records.");
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data: parsed, coverAssets };
}

export function createBackup(): BackupDocument {
  const database = getDatabase();
  const data: BackupData = {
    settings: database.select().from(settings).all(), projects: database.select().from(projects).all(), projectStatusHistory: database.select().from(projectStatusHistory).all(), projectLinks: database.select().from(projectLinks).all(), tags: database.select().from(tags).all(), projectTags: database.select().from(projectTags).all(), projectActivity: database.select().from(projectActivity).all(), projectTasks: database.select().from(projectTasks).all(), projectMilestones: database.select().from(projectMilestones).all(), projectDocuments: database.select().from(projectDocuments).all(), projectTemplates: database.select().from(projectTemplates).all(), projectTemplateTags: database.select().from(projectTemplateTags).all(), projectTemplateTasks: database.select().from(projectTemplateTasks).all(), projectTemplateMilestones: database.select().from(projectTemplateMilestones).all(), projectTemplateDocuments: database.select().from(projectTemplateDocuments).all(),
  };
  const coverAssets = data.projects.flatMap((project) => {
    if (!project.coverImagePath) return [];
    const absolutePath = path.join(getDataDirectory(), project.coverImagePath);
    if (!existsSync(absolutePath)) throw new Error(`Cannot export a missing local cover asset: ${project.coverImagePath}`);
    return [{ path: project.coverImagePath, contentBase64: readFileSync(absolutePath).toString("base64") }];
  });
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data, coverAssets };
}

export function restoreBackup(input: unknown) {
  const backup = parseBackup(input);
  const dataDirectory = getDataDirectory();
  const operationId = randomUUID();
  const stagingDirectory = path.join(dataDirectory, `.backup-import-${operationId}`);
  const stagedCoversDirectory = path.join(stagingDirectory, "covers");
  const coversDirectory = path.join(dataDirectory, "covers");
  const previousCoversDirectory = path.join(dataDirectory, `.backup-covers-previous-${operationId}`);
  mkdirSync(stagedCoversDirectory, { recursive: true });
  try {
    for (const asset of backup.coverAssets) writeFileSync(path.join(stagedCoversDirectory, path.basename(asset.path)), assetBuffer(asset.contentBase64, asset.path), { flag: "wx" });
    const hasPreviousCovers = existsSync(coversDirectory);
    if (hasPreviousCovers) renameSync(coversDirectory, previousCoversDirectory);
    renameSync(stagedCoversDirectory, coversDirectory);
    try {
      const database = getDatabase();
      database.transaction((transaction) => {
        transaction.delete(projectTemplateDocuments).run(); transaction.delete(projectTemplateMilestones).run(); transaction.delete(projectTemplateTasks).run(); transaction.delete(projectTemplateTags).run(); transaction.delete(projectTemplates).run();
        transaction.delete(projectDocuments).run(); transaction.delete(projectMilestones).run(); transaction.delete(projectTasks).run(); transaction.delete(projectActivity).run(); transaction.delete(projectTags).run(); transaction.delete(projectLinks).run(); transaction.delete(projectStatusHistory).run(); transaction.delete(tags).run(); transaction.delete(projects).run(); transaction.delete(settings).run();
        if (backup.data.settings.length) transaction.insert(settings).values(backup.data.settings).run();
        if (backup.data.projects.length) transaction.insert(projects).values(backup.data.projects).run(); if (backup.data.tags.length) transaction.insert(tags).values(backup.data.tags).run(); if (backup.data.projectStatusHistory.length) transaction.insert(projectStatusHistory).values(backup.data.projectStatusHistory).run(); if (backup.data.projectLinks.length) transaction.insert(projectLinks).values(backup.data.projectLinks).run(); if (backup.data.projectTags.length) transaction.insert(projectTags).values(backup.data.projectTags).run(); if (backup.data.projectActivity.length) transaction.insert(projectActivity).values(backup.data.projectActivity).run(); if (backup.data.projectTasks.length) transaction.insert(projectTasks).values(backup.data.projectTasks).run(); if (backup.data.projectMilestones.length) transaction.insert(projectMilestones).values(backup.data.projectMilestones).run(); if (backup.data.projectDocuments.length) transaction.insert(projectDocuments).values(backup.data.projectDocuments).run();
        if (backup.data.projectTemplates.length) transaction.insert(projectTemplates).values(backup.data.projectTemplates).run(); if (backup.data.projectTemplateTags.length) transaction.insert(projectTemplateTags).values(backup.data.projectTemplateTags).run(); if (backup.data.projectTemplateTasks.length) transaction.insert(projectTemplateTasks).values(backup.data.projectTemplateTasks).run(); if (backup.data.projectTemplateMilestones.length) transaction.insert(projectTemplateMilestones).values(backup.data.projectTemplateMilestones).run(); if (backup.data.projectTemplateDocuments.length) transaction.insert(projectTemplateDocuments).values(backup.data.projectTemplateDocuments).run();
      });
    } catch (error) {
      rmSync(coversDirectory, { recursive: true, force: true });
      if (hasPreviousCovers) renameSync(previousCoversDirectory, coversDirectory);
      throw error;
    }
    rmSync(previousCoversDirectory, { recursive: true, force: true });
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
}
