import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Durable, single-owner application preferences. Product domain tables begin in
 * Phase 02, when their lifecycle invariants are implemented alongside CRUD.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type"),
    status: text("status").notNull(),
    priority: text("priority"),
    clientName: text("client_name"),
    startDate: text("start_date"),
    deadline: text("deadline"),
    completedAt: text("completed_at"),
    cancelledAt: text("cancelled_at"),
    workProgress: integer("work_progress").notNull().default(0),
    color: text("color"),
    coverMode: text("cover_mode").notNull().default("none"),
    coverImagePath: text("cover_image_path"),
    sortOrder: real("sort_order"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at"),
  },
  (table) => [
    check("projects_work_progress_range", sql`${table.workProgress} between 0 and 100`),
    index("projects_archived_at_idx").on(table.archivedAt),
    index("projects_status_idx").on(table.status),
  ],
);

export const projectStatusHistory = sqliteTable(
  "project_status_history",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedAt: text("changed_at").notNull(),
  },
  (table) => [index("project_status_history_project_id_idx").on(table.projectId)],
);

export const projectLinks = sqliteTable(
  "project_links",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("project_links_project_id_idx").on(table.projectId)],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name)],
);

export const projectTags = sqliteTable(
  "project_tags",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.tagId] })],
);

export const projectActivity = sqliteTable(
  "project_activity",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("project_activity_project_id_idx").on(table.projectId)],
);

export const projectTasks = sqliteTable(
  "project_tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    detail: text("detail"),
    status: text("status").notNull().default("todo"),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
    sortOrder: real("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("project_tasks_project_id_idx").on(table.projectId),
    index("project_tasks_project_status_order_idx").on(table.projectId, table.status, table.sortOrder),
  ],
);

export const projectMilestones = sqliteTable(
  "project_milestones",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetDate: text("target_date").notNull(),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("project_milestones_project_id_idx").on(table.projectId),
    index("project_milestones_project_target_date_idx").on(table.projectId, table.targetDate),
  ],
);

export const projectDocuments = sqliteTable(
  "project_documents",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("project_documents_project_id_idx").on(table.projectId)],
);
