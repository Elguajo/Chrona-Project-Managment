CREATE TABLE `project_template_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `project_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_template_documents_template_id_idx` ON `project_template_documents` (`template_id`);--> statement-breakpoint
CREATE TABLE `project_template_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`target_offset_days` integer NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `project_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_template_milestones_target_offset_non_negative" CHECK("project_template_milestones"."target_offset_days" >= 0)
);
--> statement-breakpoint
CREATE INDEX `project_template_milestones_template_id_idx` ON `project_template_milestones` (`template_id`);--> statement-breakpoint
CREATE TABLE `project_template_tags` (
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`template_id`, `name`),
	FOREIGN KEY (`template_id`) REFERENCES `project_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_template_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_offset_days` integer,
	`sort_order` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `project_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "project_template_tasks_due_offset_non_negative" CHECK("project_template_tasks"."due_offset_days" is null or "project_template_tasks"."due_offset_days" >= 0)
);
--> statement-breakpoint
CREATE INDEX `project_template_tasks_template_id_idx` ON `project_template_tasks` (`template_id`);--> statement-breakpoint
CREATE TABLE `project_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`priority` text,
	`color` text,
	`is_starter` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `project_templates_starter_idx` ON `project_templates` (`is_starter`);
--> statement-breakpoint
INSERT INTO `project_templates` (`id`, `name`, `description`, `type`, `status`, `priority`, `color`, `is_starter`, `created_at`, `updated_at`) VALUES
  ('starter-client-delivery', 'Client delivery', 'A structured engagement from kickoff to handoff.', 'client', 'planning', 'high', '#2563eb', true, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('starter-product-launch', 'Product launch', 'Plan, prepare, launch, and learn from a product release.', 'development', 'planning', 'high', '#7c3aed', true, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('starter-research-sprint', 'Research sprint', 'Turn an open question into an evidence-backed decision.', 'research', 'planning', 'normal', '#059669', true, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `project_template_tags` (`template_id`, `name`) VALUES
  ('starter-client-delivery', 'client'), ('starter-client-delivery', 'delivery'),
  ('starter-product-launch', 'product'), ('starter-product-launch', 'launch'),
  ('starter-research-sprint', 'research'), ('starter-research-sprint', 'planning');
--> statement-breakpoint
INSERT INTO `project_template_tasks` (`id`, `template_id`, `title`, `detail`, `status`, `due_offset_days`, `sort_order`) VALUES
  ('starter-client-task-kickoff', 'starter-client-delivery', 'Run project kickoff', 'Confirm goals, scope, and owners.', 'todo', 0, 1024),
  ('starter-client-task-plan', 'starter-client-delivery', 'Prepare delivery plan', 'Define milestones and working agreements.', 'todo', 2, 2048),
  ('starter-client-task-review', 'starter-client-delivery', 'Collect client review', 'Capture feedback and requested changes.', 'todo', 14, 3072),
  ('starter-client-task-handoff', 'starter-client-delivery', 'Complete handoff', 'Share final deliverables and next steps.', 'todo', 21, 4096),
  ('starter-launch-task-scope', 'starter-product-launch', 'Confirm launch scope', 'Document the release outcome and constraints.', 'todo', 0, 1024),
  ('starter-launch-task-prepare', 'starter-product-launch', 'Prepare release assets', 'Finish product, communication, and support materials.', 'todo', 7, 2048),
  ('starter-launch-task-check', 'starter-product-launch', 'Run launch checklist', 'Verify readiness before launch day.', 'todo', 13, 3072),
  ('starter-launch-task-retro', 'starter-product-launch', 'Run launch retrospective', 'Record results and follow-up work.', 'todo', 21, 4096),
  ('starter-research-task-question', 'starter-research-sprint', 'Frame the research question', 'State the decision this work will inform.', 'todo', 0, 1024),
  ('starter-research-task-collect', 'starter-research-sprint', 'Collect evidence', 'Gather source material and observations.', 'todo', 3, 2048),
  ('starter-research-task-synthesize', 'starter-research-sprint', 'Synthesize findings', 'Identify themes, trade-offs, and confidence.', 'todo', 8, 3072),
  ('starter-research-task-decide', 'starter-research-sprint', 'Document recommendation', 'Turn findings into a clear next decision.', 'todo', 10, 4096);
--> statement-breakpoint
INSERT INTO `project_template_milestones` (`id`, `template_id`, `title`, `target_offset_days`, `sort_order`) VALUES
  ('starter-client-milestone-kickoff', 'starter-client-delivery', 'Kickoff complete', 0, 1024),
  ('starter-client-milestone-review', 'starter-client-delivery', 'Client review', 14, 2048),
  ('starter-client-milestone-handoff', 'starter-client-delivery', 'Final handoff', 21, 3072),
  ('starter-launch-milestone-ready', 'starter-product-launch', 'Release ready', 13, 1024),
  ('starter-launch-milestone-launch', 'starter-product-launch', 'Launch day', 14, 2048),
  ('starter-launch-milestone-retro', 'starter-product-launch', 'Retrospective complete', 21, 3072),
  ('starter-research-milestone-brief', 'starter-research-sprint', 'Research brief agreed', 1, 1024),
  ('starter-research-milestone-review', 'starter-research-sprint', 'Findings review', 9, 2048),
  ('starter-research-milestone-decision', 'starter-research-sprint', 'Decision recorded', 10, 3072);
--> statement-breakpoint
INSERT INTO `project_template_documents` (`id`, `template_id`, `title`, `content`, `sort_order`) VALUES
  ('starter-client-document-brief', 'starter-client-delivery', 'Project brief', '# Project brief\n\n## Goals\n\n## Scope\n\n## Decisions\n', 1024),
  ('starter-launch-document-brief', 'starter-product-launch', 'Launch brief', '# Launch brief\n\n## Outcome\n\n## Audience\n\n## Launch checklist\n', 1024),
  ('starter-research-document-brief', 'starter-research-sprint', 'Research brief', '# Research brief\n\n## Question\n\n## Evidence\n\n## Recommendation\n', 1024);
