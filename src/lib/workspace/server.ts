import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db/connection";
import { projectActivity, projectDocuments, projectMilestones, projects, projectTasks } from "@/lib/db/schema";
import { ProjectValidationError } from "@/lib/projects/server";
import { TASK_STATUSES, type TaskStatus } from "@/lib/projects/types";

const TASK_ORDER_GAP = 1_024;

function now() {
  return new Date().toISOString();
}

function optionalString(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new ProjectValidationError(`${key} must be at most ${maxLength} characters.`);
  return trimmed;
}

function requiredString(formData: FormData, key: string, maxLength: number) {
  const value = optionalString(formData, key, maxLength);
  if (!value) throw new ProjectValidationError(`${key} is required.`);
  return value;
}

function calendarDate(value: string | null, key: string, required = false) {
  if (!value) {
    if (required) throw new ProjectValidationError(`${key} is required.`);
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new ProjectValidationError(`${key} must use YYYY-MM-DD.`);
  const candidate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (candidate.getUTCFullYear() !== Number(match[1]) || candidate.getUTCMonth() !== Number(match[2]) - 1 || candidate.getUTCDate() !== Number(match[3])) {
    throw new ProjectValidationError(`${key} must be a valid calendar date.`);
  }
  return value;
}

function taskStatus(formData: FormData) {
  const value = requiredString(formData, "status", 32);
  if (!TASK_STATUSES.includes(value as TaskStatus)) throw new ProjectValidationError("Invalid task status.");
  return value as TaskStatus;
}

function assertWritableProject(projectId: string) {
  const project = getDatabase().select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw new ProjectValidationError("Project no longer exists.");
  if (project.archivedAt) throw new ProjectValidationError("Restore the project before changing its workspace.");
  return project;
}

function addActivity(
  projectId: string,
  type: string,
  createdAt: string,
  metadata: Record<string, unknown> = {},
) {
  getDatabase().insert(projectActivity).values({
    id: randomUUID(), projectId, type, metadataJson: JSON.stringify(metadata), createdAt,
  }).run();
}

function touchProject(projectId: string, updatedAt: string) {
  getDatabase().update(projects).set({ updatedAt }).where(eq(projects.id, projectId)).run();
}

function taskInput(formData: FormData) {
  return {
    title: requiredString(formData, "title", 240),
    detail: optionalString(formData, "detail", 5_000),
    status: taskStatus(formData),
    dueDate: calendarDate(optionalString(formData, "dueDate", 10), "dueDate"),
  };
}

export function createTask(projectId: string, formData: FormData) {
  assertWritableProject(projectId);
  const input = taskInput(formData);
  const database = getDatabase();
  const createdAt = now();
  const existing = database.select().from(projectTasks).where(and(eq(projectTasks.projectId, projectId), eq(projectTasks.status, input.status))).all();
  const sortOrder = Math.max(0, ...existing.map((task) => task.sortOrder)) + TASK_ORDER_GAP;
  database.transaction(() => {
    database.insert(projectTasks).values({
      id: randomUUID(), projectId, ...input,
      completedAt: input.status === "done" ? createdAt : null,
      sortOrder, createdAt, updatedAt: createdAt,
    }).run();
    touchProject(projectId, createdAt);
    addActivity(projectId, "task_created", createdAt, { status: input.status, title: input.title });
  });
}

export function updateTask(projectId: string, taskId: string, formData: FormData) {
  assertWritableProject(projectId);
  const input = taskInput(formData);
  const database = getDatabase();
  const existing = database.select().from(projectTasks).where(and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Task no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.update(projectTasks).set({
      ...input,
      completedAt: input.status === "done" ? existing.completedAt ?? updatedAt : null,
      updatedAt,
    }).where(eq(projectTasks.id, taskId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, "task_updated", updatedAt, { taskId, from: existing.status, to: input.status });
  });
}

export function deleteTask(projectId: string, taskId: string) {
  assertWritableProject(projectId);
  const database = getDatabase();
  const existing = database.select().from(projectTasks).where(and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Task no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.delete(projectTasks).where(eq(projectTasks.id, taskId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, "task_deleted", updatedAt, { taskId, title: existing.title });
  });
}

export function createMilestone(projectId: string, formData: FormData) {
  assertWritableProject(projectId);
  const title = requiredString(formData, "title", 240);
  const targetDate = calendarDate(optionalString(formData, "targetDate", 10), "targetDate", true)!;
  const database = getDatabase();
  const createdAt = now();
  database.transaction(() => {
    database.insert(projectMilestones).values({
      id: randomUUID(), projectId, title, targetDate, completedAt: null, createdAt, updatedAt: createdAt,
    }).run();
    touchProject(projectId, createdAt);
    addActivity(projectId, "milestone_created", createdAt, { title, targetDate });
  });
}

export function toggleMilestone(projectId: string, milestoneId: string, completed: boolean) {
  assertWritableProject(projectId);
  const database = getDatabase();
  const existing = database.select().from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Milestone no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.update(projectMilestones).set({ completedAt: completed ? updatedAt : null, updatedAt }).where(eq(projectMilestones.id, milestoneId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, completed ? "milestone_completed" : "milestone_reopened", updatedAt, { milestoneId });
  });
}

export function deleteMilestone(projectId: string, milestoneId: string) {
  assertWritableProject(projectId);
  const database = getDatabase();
  const existing = database.select().from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Milestone no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, "milestone_deleted", updatedAt, { milestoneId, title: existing.title });
  });
}

function documentInput(formData: FormData) {
  return {
    title: requiredString(formData, "title", 240),
    content: optionalString(formData, "content", 50_000) ?? "",
  };
}

export function createDocument(projectId: string, formData: FormData) {
  assertWritableProject(projectId);
  const input = documentInput(formData);
  const database = getDatabase();
  const createdAt = now();
  database.transaction(() => {
    database.insert(projectDocuments).values({ id: randomUUID(), projectId, ...input, createdAt, updatedAt: createdAt }).run();
    touchProject(projectId, createdAt);
    addActivity(projectId, "document_created", createdAt, { title: input.title });
  });
}

export function updateDocument(projectId: string, documentId: string, formData: FormData) {
  assertWritableProject(projectId);
  const input = documentInput(formData);
  const database = getDatabase();
  const existing = database.select().from(projectDocuments).where(and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Document no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.update(projectDocuments).set({ ...input, updatedAt }).where(eq(projectDocuments.id, documentId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, "document_updated", updatedAt, { documentId, title: input.title });
  });
}

export function deleteDocument(projectId: string, documentId: string) {
  assertWritableProject(projectId);
  const database = getDatabase();
  const existing = database.select().from(projectDocuments).where(and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, projectId))).get();
  if (!existing) throw new ProjectValidationError("Document no longer exists in this project.");
  const updatedAt = now();
  database.transaction(() => {
    database.delete(projectDocuments).where(eq(projectDocuments.id, documentId)).run();
    touchProject(projectId, updatedAt);
    addActivity(projectId, "document_deleted", updatedAt, { documentId, title: existing.title });
  });
}
