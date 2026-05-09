ALTER TABLE `repos` ADD `github_connection_id` text REFERENCES connections(id);--> statement-breakpoint
ALTER TABLE `runs` ADD `base_sha` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `iteration_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `pushed_at` integer;