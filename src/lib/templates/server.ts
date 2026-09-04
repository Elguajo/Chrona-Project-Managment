import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db/connection";
import {
  projectTemplateDocuments,
  projectTemplateMilestones,
  projectTemplateTags,
  projectTemplateTasks,
  projectTemplates,
} from "@/lib/db/schema";
import {
  createProjectFromInput,
  parseProjectInput,
  ProjectValidationError,
} from "@/lib/projects/server";
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
  type ProjectPriority,
  type ProjectStatus,
  type ProjectTemplateDraft,
  type ProjectTemplateRecord,
  type ProjectType,
  type TaskStatus,
} from "@/lib/projects/types";
import { addCalendarDays } from "@/lib/timeline/date";

const MAX_OFFSET_DAYS = 3_660;

function now() {
  return new Date().toISOString();
}

function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value);
}

function text(value: unknown, key: string, maxLength: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new ProjectValidationError(`${key} is required.`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new ProjectValidationError(`${key} is required.`);
    return null;
  }
  if (trimmed.length > maxLength) throw new ProjectValidationError(`${key} must be at most ${maxLength} characters.`);
  return trimmed;
}

function requiredText(value: unknown, key: string, maxLength: number) {
  return text(value, key, maxLength, true)!;
}

function optionalEnum<T extends readonly string[]>(value: unknown, key: string, values: T) {
  const candidate = text(value, key, 64);
  if (!candidate) return null;
  if (!isOneOf(candidate, values)) throw new ProjectValidationError(`Invalid ${key}.`);
  return candidate;
}

function offset(value: unknown, key: string, required = false) {
  if (value === null || value === undefined || value === "") {
    if (required) throw new ProjectValidationError(`${key} is required.`);
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_OFFSET_DAYS) {
    throw new ProjectValidationError(`${key} must be a whole number from 0 to ${MAX_OFFSET_DAYS}.`);
  }
  return value;
}

function payload(formData: FormData): ProjectTemplateDraft {
  const raw = formData.get("templatePayload");
  if (typeof raw !== "string") throw new ProjectValidationError("Template content is missing.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProjectValidationError("Template content is invalid.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ProjectValidationError("Template content is invalid.");
  const record = parsed as Record<string, unknown>;
  const asArray = (key: string) => {
    const value = record[key];
    if (!Array.isArray(value)) throw new ProjectValidationError(`${key} must be a list.`);
    return value;
  };

  const taskItems = asArray("tasks");
  const milestoneItems = asArray("milestones");
  const documentItems = asArray("documents");
  if (taskItems.length > 100 || milestoneItems.length > 100 || documentItems.length > 100) {
    throw new ProjectValidationError("A template may contain at most 100 records of each kind.");
  }

  const type = optionalEnum(record.type, "type", PROJECT_TYPES) as ProjectType | null;
  const status = optionalEnum(record.status, "status", PROJECT_STATUSES) as ProjectStatus | null;
  const priority = optionalEnum(record.priority, "priority", PROJECT_PRIORITIES) as ProjectPriority | null;
  const color = text(record.color, "color", 7);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new ProjectValidationError("Color must be a six-digit hexadecimal value.");
  const tagsRaw = text(record.tags, "tags", 600) ?? "";
  const tags = [...new Set(tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > 20 || tags.some((tag) => tag.length > 48)) throw new ProjectValidationError("Use up to 20 tags, each with at most 48 characters.");

  return {
    name: requiredText(record.name, "name", 160),
    description: text(record.description, "description", 5_000) ?? "",
    type: type ?? "",
    status: status ?? "planning",
    priority: priority ?? "",
    color: color ?? "",
    tags: tags.join(", "),
    tasks: taskItems.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new ProjectValidationError(`tasks[${index}] is invalid.`);
      const task = item as Record<string, unknown>;
      const taskStatus = optionalEnum(task.status, `tasks[${index}].status`, TASK_STATUSES) as TaskStatus | null;
      return {
        title: requiredText(task.title, `tasks[${index}].title`, 240),
        detail: text(task.detail, `tasks[${index}].detail`, 5_000) ?? "",
        status: taskStatus ?? "todo",
        dueOffsetDays: offset(task.dueOffsetDays, `tasks[${index}].dueOffsetDays`),
      };
    }),
    milestones: milestoneItems.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new ProjectValidationError(`milestones[${index}] is invalid.`);
      const milestone = item as Record<string, unknown>;
      return {
        title: requiredText(milestone.title, `milestones[${index}].title`, 240),
        targetOffsetDays: offset(milestone.targetOffsetDays, `milestones[${index}].targetOffsetDays`, true)!,
      };
    }),
    documents: documentItems.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new ProjectValidationError(`documents[${index}] is invalid.`);
      const document = item as Record<string, unknown>;
      return {
        title: requiredText(document.title, `documents[${index}].title`, 240),
        content: text(document.content, `documents[${index}].content`, 50_000) ?? "",
      };
    }),
  };
}

function getTemplate(templateId: string): ProjectTemplateRecord | null {
  const database = getDatabase();
  const template = database.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).get();
  if (!template) return null;
  const tasks = database.select().from(projectTemplateTasks).where(eq(projectTemplateTasks.templateId, templateId)).all()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const milestones = database.select().from(projectTemplateMilestones).where(eq(projectTemplateMilestones.templateId, templateId)).all()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const documents = database.select().from(projectTemplateDocuments).where(eq(projectTemplateDocuments.templateId, templateId)).all()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const tags = database.select().from(projectTemplateTags).where(eq(projectTemplateTags.templateId, templateId)).all().map((tag) => tag.name).sort();
  const offsets = [
    ...tasks.map((task) => task.dueOffsetDays).filter((value): value is number => value !== null),
    ...milestones.map((milestone) => milestone.targetOffsetDays),
  ];
  return {
    ...template,
    type: template.type as ProjectType | null,
    status: template.status as ProjectStatus,
    priority: template.priority as ProjectPriority | null,
    tags,
    tasks: tasks.map((task) => ({ ...task, status: task.status as TaskStatus })),
    milestones,
    documents,
    requiresStartDate: offsets.length > 0,
    maxOffsetDays: offsets.length ? Math.max(...offsets) : null,
  };
}

export function getProjectTemplates(): ProjectTemplateRecord[] {
  return getDatabase().select().from(projectTemplates).all()
    .map((template) => getTemplate(template.id)!)
    .sort((left, right) => Number(right.isStarter) - Number(left.isStarter) || left.name.localeCompare(right.name));
}

function assertPersonalTemplate(templateId: string) {
  const template = getTemplate(templateId);
  if (!template) throw new ProjectValidationError("Template no longer exists.");
  if (template.isStarter) throw new ProjectValidationError("Starter templates are read-only. Duplicate one to customize it.");
  return template;
}

function writeTemplateRows(
  database: Pick<ReturnType<typeof getDatabase>, "insert">,
  templateId: string,
  draft: ProjectTemplateDraft,
  createdAt: string,
  isStarter = false,
  updatedAt = createdAt,
) {
  database.insert(projectTemplates).values({
      id: templateId,
      name: draft.name,
      description: draft.description || null,
      type: draft.type || null,
      status: draft.status,
      priority: draft.priority || null,
      color: draft.color || null,
      isStarter,
      createdAt,
      updatedAt,
  }).run();
  for (const tag of draft.tags.split(",").map((value) => value.trim()).filter(Boolean)) {
    database.insert(projectTemplateTags).values({ templateId, name: tag }).run();
  }
  draft.tasks.forEach((task, index) => database.insert(projectTemplateTasks).values({
      id: randomUUID(), templateId, title: task.title, detail: task.detail || null, status: task.status,
      dueOffsetDays: task.dueOffsetDays, sortOrder: (index + 1) * 1024,
  }).run());
  draft.milestones.forEach((milestone, index) => database.insert(projectTemplateMilestones).values({
      id: randomUUID(), templateId, title: milestone.title, targetOffsetDays: milestone.targetOffsetDays, sortOrder: (index + 1) * 1024,
  }).run());
  draft.documents.forEach((document, index) => database.insert(projectTemplateDocuments).values({
      id: randomUUID(), templateId, title: document.title, content: document.content, sortOrder: (index + 1) * 1024,
  }).run());
}

function writeTemplate(templateId: string, draft: ProjectTemplateDraft, createdAt: string, isStarter = false) {
  getDatabase().transaction((transaction) => {
    writeTemplateRows(transaction, templateId, draft, createdAt, isStarter);
  });
}

export function createTemplate(formData: FormData) {
  const draft = payload(formData);
  const id = randomUUID();
  writeTemplate(id, draft, now());
  return id;
}

export function updateTemplate(templateId: string, formData: FormData) {
  const existing = assertPersonalTemplate(templateId);
  const draft = payload(formData);
  const database = getDatabase();
  const updatedAt = now();
  database.transaction((transaction) => {
    transaction.delete(projectTemplates).where(eq(projectTemplates.id, templateId)).run();
    writeTemplateRows(transaction, templateId, draft, existing.createdAt, false, updatedAt);
  });
}

export function duplicateTemplate(templateId: string) {
  const template = getTemplate(templateId);
  if (!template) throw new ProjectValidationError("Template no longer exists.");
  const id = randomUUID();
  const draft: ProjectTemplateDraft = {
    name: `${template.name} copy`, description: template.description ?? "", type: template.type ?? "", status: template.status,
    priority: template.priority ?? "", color: template.color ?? "", tags: template.tags.join(", "),
    tasks: template.tasks.map((task) => ({ title: task.title, detail: task.detail ?? "", status: task.status, dueOffsetDays: task.dueOffsetDays })),
    milestones: template.milestones.map((milestone) => ({ title: milestone.title, targetOffsetDays: milestone.targetOffsetDays })),
    documents: template.documents.map((document) => ({ title: document.title, content: document.content })),
  };
  writeTemplate(id, draft, now());
  return id;
}

export function deleteTemplate(templateId: string) {
  assertPersonalTemplate(templateId);
  getDatabase().delete(projectTemplates).where(eq(projectTemplates.id, templateId)).run();
}

export async function createProjectFromTemplate(templateId: string, formData: FormData) {
  const template = getTemplate(templateId);
  if (!template) throw new ProjectValidationError("Template no longer exists.");
  const input = parseProjectInput(formData);
  if (template.requiresStartDate && !input.startDate) throw new ProjectValidationError("A start date is required for this scheduled template.");
  const startDate = input.startDate;
  const milestones = template.milestones.map((milestone) => ({
    title: milestone.title,
    targetDate: addCalendarDays(startDate!, milestone.targetOffsetDays),
  }));
  const latestMilestone = milestones.at(-1)?.targetDate;
  if (input.deadline && latestMilestone && input.deadline < latestMilestone) {
    throw new ProjectValidationError("Deadline cannot be earlier than the template's final milestone.");
  }
  return createProjectFromInput({
    ...input,
    description: input.description ?? template.description,
    type: input.type ?? template.type,
    priority: input.priority ?? template.priority,
    color: input.color ?? template.color,
    deadline: input.deadline ?? latestMilestone ?? null,
    tagNames: [...new Set([...template.tags, ...input.tagNames])],
  }, {
    tasks: template.tasks.map((task) => ({
      title: task.title,
      detail: task.detail,
      status: task.status,
      dueDate: task.dueOffsetDays === null ? null : addCalendarDays(startDate!, task.dueOffsetDays),
    })),
    milestones,
    documents: template.documents.map((document) => ({ title: document.title, content: document.content })),
    activity: { type: "created_from_template", metadata: { templateId: template.id, templateName: template.name } },
  });
}
