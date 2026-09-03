import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDatabase, getDataDirectory } from "@/lib/db/connection";
import {
  projectActivity,
  projectDocuments,
  projectLinks,
  projectMilestones,
  projectStatusHistory,
  projectTasks,
  projects,
  projectTags,
  tags,
} from "@/lib/db/schema";
import {
  COVER_MODES,
  LINK_TYPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type CoverMode,
  type LinkType,
  type ProjectActionResult,
  type ProjectPriority,
  type ProjectRecord,
  type ProjectStatus,
  type ProjectType,
  type TaskStatus,
} from "@/lib/projects/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TAGS = 20;

type ProjectInput = {
  name: string;
  description: string | null;
  type: ProjectType | null;
  status: ProjectStatus;
  priority: ProjectPriority | null;
  clientName: string | null;
  startDate: string | null;
  deadline: string | null;
  workProgress: number;
  color: string | null;
  coverMode: CoverMode;
  tagNames: string[];
  link: { type: LinkType; title: string; url: string } | null;
  coverImage: File | null;
};

type ProjectWriteDatabase = Pick<ReturnType<typeof getDatabase>, "delete" | "insert" | "select" | "update">;

const ORDER_GAP = 1_024;
const ORDER_PRECISION_LIMIT = 0.000_001;

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

function now() {
  return new Date().toISOString();
}

function localCalendarDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value);
}

function optionalString(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new ProjectValidationError(`${key} must be at most ${maxLength} characters.`);
  }
  return trimmed;
}

function requiredString(formData: FormData, key: string, maxLength: number) {
  const value = optionalString(formData, key, maxLength);
  if (!value) {
    throw new ProjectValidationError(`${key} is required.`);
  }
  return value;
}

function optionalEnum<T extends readonly string[]>(formData: FormData, key: string, values: T) {
  const value = optionalString(formData, key, 64);
  if (!value) {
    return null;
  }
  if (!isOneOf(value, values)) {
    throw new ProjectValidationError(`Invalid ${key}.`);
  }
  return value;
}

function validateCalendarDate(value: string | null, key: string) {
  if (!value) {
    return null;
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateParts) {
    throw new ProjectValidationError(`${key} must use YYYY-MM-DD.`);
  }

  const year = Number(dateParts[1]);
  const month = Number(dateParts[2]);
  const day = Number(dateParts[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new ProjectValidationError(`${key} must be a valid calendar date.`);
  }
  return value;
}

function parseTagNames(formData: FormData) {
  const raw = optionalString(formData, "tags", 600);
  if (!raw) {
    return [];
  }

  const names = [...new Set(raw.split(",").map((name) => name.trim()).filter(Boolean))];
  if (names.length > MAX_TAGS || names.some((name) => name.length > 48)) {
    throw new ProjectValidationError("Use up to 20 tags, each with at most 48 characters.");
  }
  return names;
}

function parseLink(formData: FormData) {
  const title = optionalString(formData, "linkTitle", 160);
  const url = optionalString(formData, "linkUrl", 2_048);
  if (!title && !url) {
    return null;
  }
  if (!title || !url) {
    throw new ProjectValidationError("A link needs both a title and URL.");
  }

  const type = optionalEnum(formData, "linkType", LINK_TYPES) ?? "custom";
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new ProjectValidationError("Link URL must be a valid http(s) URL.");
  }
  return { type, title, url };
}

function parseCoverImage(formData: FormData) {
  const value = formData.get("coverImage");
  return typeof File !== "undefined" && value instanceof File && value.size > 0 ? value : null;
}

export function parseProjectInput(formData: FormData): ProjectInput {
  const startDate = validateCalendarDate(optionalString(formData, "startDate", 10), "startDate");
  const deadline = validateCalendarDate(optionalString(formData, "deadline", 10), "deadline");
  if (startDate && deadline && deadline < startDate) {
    throw new ProjectValidationError("Deadline cannot be earlier than the start date.");
  }

  const rawProgress = requiredString(formData, "workProgress", 3);
  if (!/^(0|[1-9]\d?|100)$/.test(rawProgress)) {
    throw new ProjectValidationError("Work progress must be a whole number from 0 to 100.");
  }

  const status = optionalEnum(formData, "status", PROJECT_STATUSES);
  if (!status) {
    throw new ProjectValidationError("status is required.");
  }
  const coverMode = optionalEnum(formData, "coverMode", COVER_MODES) ?? "none";
  const color = optionalString(formData, "color", 7);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new ProjectValidationError("Color must be a six-digit hexadecimal value.");
  }

  const input: ProjectInput = {
    name: requiredString(formData, "name", 160),
    description: optionalString(formData, "description", 5_000),
    type: optionalEnum(formData, "type", PROJECT_TYPES),
    status,
    priority: optionalEnum(formData, "priority", PROJECT_PRIORITIES),
    clientName: optionalString(formData, "clientName", 160),
    startDate,
    deadline,
    workProgress: Number(rawProgress),
    color,
    coverMode,
    tagNames: parseTagNames(formData),
    link: parseLink(formData),
    coverImage: parseCoverImage(formData),
  };

  if (input.coverMode !== "image" && input.coverImage) {
    throw new ProjectValidationError("Set cover mode to image before uploading a cover.");
  }
  if (["completed", "cancelled"].includes(input.status) && startDate && startDate > localCalendarDate()) {
    throw new ProjectValidationError("A completed or cancelled project cannot precede its start date.");
  }

  return input;
}

function imageExtension(file: File) {
  const bytes = new Uint8Array(file.size);
  return file.arrayBuffer().then((buffer) => {
    bytes.set(new Uint8Array(buffer));
    const png = bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
    const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const gif = bytes.length >= 6 && new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/);
    const webp = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    const typeBySignature = png ? "image/png" : jpeg ? "image/jpeg" : gif ? "image/gif" : webp ? "image/webp" : null;
    if (!typeBySignature || file.type !== typeBySignature) {
      throw new ProjectValidationError("Cover image must be a valid PNG, JPEG, GIF, or WebP file.");
    }
    return { buffer, extension: typeBySignature.split("/")[1] };
  });
}

async function storeCoverImage(file: File | null) {
  if (!file) {
    return null;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ProjectValidationError("Cover image must be 5 MB or smaller.");
  }

  const { buffer, extension } = await imageExtension(file);
  const fileName = `${randomUUID()}.${extension}`;
  const coverDirectory = path.join(getDataDirectory(), "covers");
  mkdirSync(coverDirectory, { recursive: true });
  writeFileSync(path.join(coverDirectory, fileName), new Uint8Array(buffer), { flag: "wx" });
  return `covers/${fileName}`;
}

function removeCoverImage(coverImagePath: string | null) {
  if (!coverImagePath || !/^covers\/[0-9a-f-]+\.(png|jpeg|gif|webp)$/.test(coverImagePath)) {
    return;
  }
  rmSync(path.join(getDataDirectory(), coverImagePath), { force: true });
}

function addActivity(
  database: ProjectWriteDatabase,
  projectId: string,
  type: string,
  createdAt: string,
  metadata: Record<string, unknown> = {},
) {
  database.insert(projectActivity).values({
    id: randomUUID(),
    projectId,
    type,
    metadataJson: JSON.stringify(metadata),
    createdAt,
  }).run();
}

function replaceProjectRelations(
  database: ProjectWriteDatabase,
  projectId: string,
  input: ProjectInput,
  createdAt: string,
) {
  database.delete(projectTags).where(eq(projectTags.projectId, projectId)).run();
  database.delete(projectLinks).where(eq(projectLinks.projectId, projectId)).run();

  for (const name of input.tagNames) {
    const existing = database.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
    const tagId = existing?.id ?? randomUUID();
    if (!existing) {
      database.insert(tags).values({ id: tagId, name, createdAt }).run();
    }
    database.insert(projectTags).values({ projectId, tagId }).run();
  }

  if (input.link) {
    database.insert(projectLinks).values({
      id: randomUUID(),
      projectId,
      ...input.link,
      createdAt,
    }).run();
  }
}

function projectValues(input: ProjectInput, eventTime: string, coverImagePath: string | null) {
  return {
    name: input.name,
    description: input.description,
    type: input.type,
    status: input.status,
    priority: input.priority,
    clientName: input.clientName,
    startDate: input.startDate,
    deadline: input.deadline,
    completedAt: input.status === "completed" ? eventTime : null,
    cancelledAt: input.status === "cancelled" ? eventTime : null,
    workProgress: input.workProgress,
    color: input.color,
    coverMode: input.coverMode,
    coverImagePath,
    updatedAt: eventTime,
  };
}

export async function createProject(formData: FormData) {
  const input = parseProjectInput(formData);
  if (input.coverMode === "image" && !input.coverImage) {
    throw new ProjectValidationError("Choose a local image when cover mode is image.");
  }
  const eventTime = now();
  const coverImagePath = await storeCoverImage(input.coverImage);
  const id = randomUUID();
  const database = getDatabase();

  try {
    database.transaction((transaction) => {
      transaction.insert(projects).values({
        id,
        ...projectValues(input, eventTime, coverImagePath),
        createdAt: eventTime,
        sortOrder: null,
        archivedAt: null,
      }).run();
      transaction.insert(projectStatusHistory).values({
        id: randomUUID(), projectId: id, fromStatus: null, toStatus: input.status, changedAt: eventTime,
      }).run();
      replaceProjectRelations(transaction, id, input, eventTime);
      addActivity(transaction, id, "created", eventTime, { status: input.status });
      if (input.status === "completed") addActivity(transaction, id, "completed", eventTime);
      if (input.status === "cancelled") addActivity(transaction, id, "cancelled", eventTime);
    });
  } catch (error) {
    removeCoverImage(coverImagePath);
    throw error;
  }
}

export async function updateProject(projectId: string, formData: FormData) {
  const input = parseProjectInput(formData);
  const database = getDatabase();
  const existing = database.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) throw new ProjectValidationError("Project no longer exists.");

  const eventTime = now();
  const uploadedCoverPath = await storeCoverImage(input.coverImage);
  const coverImagePath = input.coverMode === "image" ? uploadedCoverPath ?? existing.coverImagePath : null;
  if (input.coverMode === "image" && !coverImagePath) {
    throw new ProjectValidationError("Choose a local image when cover mode is image.");
  }

  try {
    database.transaction((transaction) => {
      transaction.update(projects).set(projectValues(input, eventTime, coverImagePath)).where(eq(projects.id, projectId)).run();
      replaceProjectRelations(transaction, projectId, input, eventTime);

      if (existing.status !== input.status) {
        transaction.insert(projectStatusHistory).values({
          id: randomUUID(), projectId, fromStatus: existing.status, toStatus: input.status, changedAt: eventTime,
        }).run();
        addActivity(transaction, projectId, "status_changed", eventTime, { from: existing.status, to: input.status });
        if (input.status === "completed") addActivity(transaction, projectId, "completed", eventTime);
        if (input.status === "cancelled") addActivity(transaction, projectId, "cancelled", eventTime);
        if (["completed", "cancelled"].includes(existing.status) && input.status === "active") {
          addActivity(transaction, projectId, "reopened", eventTime, { from: existing.status });
        }
      }
      if (existing.deadline !== input.deadline) addActivity(transaction, projectId, "deadline_changed", eventTime, { from: existing.deadline, to: input.deadline });
      if (existing.workProgress !== input.workProgress) addActivity(transaction, projectId, "progress_changed", eventTime, { from: existing.workProgress, to: input.workProgress });
    });
  } catch (error) {
    removeCoverImage(uploadedCoverPath);
    throw error;
  }

  if (existing.coverImagePath !== coverImagePath) removeCoverImage(existing.coverImagePath);
}

function projectOrderValue(project: { sortOrder: number | null }, index: number) {
  return project.sortOrder ?? (index + 1) * ORDER_GAP;
}

function orderProjects<T extends { sortOrder: number | null; createdAt: string }>(projectRows: T[]) {
  return [...projectRows].sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

/**
 * Moves one Project in the shared lifecycle projection. The order value is
 * fractional whenever there is room, with a local compaction only after too
 * many inserts between the same two neighbours.
 */
export function moveProject(projectId: string, toStatus: ProjectStatus, beforeProjectId: string | null) {
  if (!isOneOf(toStatus, PROJECT_STATUSES)) {
    throw new ProjectValidationError("Invalid destination status.");
  }

  const database = getDatabase();
  const existing = database.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) throw new ProjectValidationError("Project no longer exists.");
  if (existing.archivedAt) throw new ProjectValidationError("Archived projects cannot be moved on the Kanban board.");

  const destination = orderProjects(
    database
      .select()
      .from(projects)
      .where(and(eq(projects.status, toStatus), isNull(projects.archivedAt)))
      .all()
      .filter((project) => project.id !== projectId),
  );
  const insertionIndex = beforeProjectId
    ? destination.findIndex((project) => project.id === beforeProjectId)
    : destination.length;
  if (beforeProjectId && insertionIndex === -1) {
    throw new ProjectValidationError("The drop target is no longer available.");
  }

  const previous = destination[insertionIndex - 1];
  const next = destination[insertionIndex];
  const previousOrder = previous ? projectOrderValue(previous, insertionIndex - 1) : null;
  const nextOrder = next ? projectOrderValue(next, insertionIndex) : null;
  let sortOrder = previousOrder !== null && nextOrder !== null
    ? (previousOrder + nextOrder) / 2
    : previousOrder !== null
      ? previousOrder + ORDER_GAP
      : nextOrder !== null
        ? nextOrder - ORDER_GAP
        : ORDER_GAP;

  const eventTime = now();
  database.transaction((transaction) => {
    if (previousOrder !== null && nextOrder !== null && Math.abs(nextOrder - previousOrder) < ORDER_PRECISION_LIMIT) {
      const compacted = [...destination];
      compacted.splice(insertionIndex, 0, existing);
      compacted.forEach((project, index) => {
        transaction.update(projects).set({ sortOrder: (index + 1) * ORDER_GAP }).where(eq(projects.id, project.id)).run();
      });
      sortOrder = (insertionIndex + 1) * ORDER_GAP;
    }

    transaction
      .update(projects)
      .set({
        status: toStatus,
        sortOrder,
        completedAt: toStatus === "completed" ? eventTime : null,
        cancelledAt: toStatus === "cancelled" ? eventTime : null,
        updatedAt: eventTime,
      })
      .where(eq(projects.id, projectId))
      .run();

    if (existing.status !== toStatus) {
      transaction.insert(projectStatusHistory).values({
        id: randomUUID(), projectId, fromStatus: existing.status, toStatus, changedAt: eventTime,
      }).run();
      addActivity(transaction, projectId, "status_changed", eventTime, { from: existing.status, to: toStatus });
      if (toStatus === "completed") addActivity(transaction, projectId, "completed", eventTime);
      if (toStatus === "cancelled") addActivity(transaction, projectId, "cancelled", eventTime);
      if (["completed", "cancelled"].includes(existing.status) && toStatus === "active") {
        addActivity(transaction, projectId, "reopened", eventTime, { from: existing.status });
      }
    } else {
      addActivity(transaction, projectId, "reordered", eventTime, { status: toStatus });
    }
  });
}

export function archiveProject(projectId: string) {
  const database = getDatabase();
  const existing = database.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) throw new ProjectValidationError("Project no longer exists.");
  if (existing.archivedAt) throw new ProjectValidationError("Project is already archived.");
  const eventTime = now();
  database.transaction((transaction) => {
    transaction.update(projects).set({ archivedAt: eventTime, updatedAt: eventTime }).where(eq(projects.id, projectId)).run();
    addActivity(transaction, projectId, "archived", eventTime);
  });
}

export function restoreProject(projectId: string) {
  const database = getDatabase();
  const existing = database.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) throw new ProjectValidationError("Project no longer exists.");
  if (!existing.archivedAt) throw new ProjectValidationError("Project is not archived.");
  const eventTime = now();
  database.transaction((transaction) => {
    transaction.update(projects).set({ archivedAt: null, updatedAt: eventTime }).where(eq(projects.id, projectId)).run();
    addActivity(transaction, projectId, "restored", eventTime);
  });
}

export function permanentlyDeleteProject(projectId: string, confirmation: string) {
  if (confirmation !== "DELETE") {
    throw new ProjectValidationError('Type "DELETE" to permanently remove a project.');
  }
  const database = getDatabase();
  const existing = database.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!existing) throw new ProjectValidationError("Project no longer exists.");
  database.delete(projects).where(eq(projects.id, projectId)).run();
  removeCoverImage(existing.coverImagePath);
}

export function getProjects(): ProjectRecord[] {
  const database = getDatabase();
  const rows = database.select().from(projects).all();
  if (rows.length === 0) return [];
  const ids = rows.map((project) => project.id);
  const tagRows = database
    .select({ projectId: projectTags.projectId, name: tags.name })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, ids))
    .all();
  const linkRows = database.select().from(projectLinks).where(inArray(projectLinks.projectId, ids)).all();
  const taskRows = database.select().from(projectTasks).where(inArray(projectTasks.projectId, ids)).all();
  const milestoneRows = database.select().from(projectMilestones).where(inArray(projectMilestones.projectId, ids)).all();
  const documentRows = database.select().from(projectDocuments).where(inArray(projectDocuments.projectId, ids)).all();

  return rows
    .map((project) => ({
      ...project,
      tags: tagRows
        .filter((tag) => tag.projectId === project.id)
        .map((tag) => tag.name)
        .sort((left, right) => left.localeCompare(right)),
      links: linkRows
        .filter((link) => link.projectId === project.id)
        .map((link) => ({ id: link.id, type: link.type, title: link.title, url: link.url })),
      tasks: taskRows
        .filter((task) => task.projectId === project.id)
        .map((task) => ({ ...task, status: task.status as TaskStatus }))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
      milestones: milestoneRows
        .filter((milestone) => milestone.projectId === project.id)
        .sort((left, right) => left.targetDate.localeCompare(right.targetDate) || left.createdAt.localeCompare(right.createdAt)),
      documents: documentRows
        .filter((document) => document.projectId === project.id)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getKanbanProjects(): ProjectRecord[] {
  return getProjects()
    .filter((project) => !project.archivedAt)
    .sort((left, right) => {
      const statusDifference = PROJECT_STATUSES.indexOf(left.status as ProjectStatus) - PROJECT_STATUSES.indexOf(right.status as ProjectStatus);
      if (statusDifference !== 0) return statusDifference;
      const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.createdAt.localeCompare(right.createdAt);
    });
}

export function projectActionResult(error: unknown): ProjectActionResult {
  if (error instanceof ProjectValidationError) return { ok: false, error: error.message };
  console.error("Project operation failed", error);
  return { ok: false, error: "Unable to save the project. Your existing data was not changed." };
}
