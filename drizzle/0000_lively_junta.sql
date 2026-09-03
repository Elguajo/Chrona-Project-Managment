CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value_json`) VALUES
  ('appearance', '"dark"'),
  ('default_view', '"kanban"'),
  ('sidebar_collapsed', 'false');
