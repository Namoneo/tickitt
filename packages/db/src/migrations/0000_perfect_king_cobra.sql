CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`binary_path` text NOT NULL,
	`args_json` text DEFAULT '[]' NOT NULL,
	`env_json` text DEFAULT '{}' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`config_json` text NOT NULL,
	`secret_ref` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repos` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`remote_url` text NOT NULL,
	`default_branch` text DEFAULT 'main' NOT NULL,
	`local_path` text NOT NULL,
	`last_synced_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`ts` integer NOT NULL,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `run_events_run_idx` ON `run_events` (`run_id`,`ts`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`repo_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`worktree_path` text NOT NULL,
	`branch_name` text NOT NULL,
	`state` text NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`error` text,
	`pr_url` text,
	`token_cost` integer,
	`approval_decision` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `runs_state_idx` ON `runs` (`state`);--> statement-breakpoint
CREATE INDEX `runs_ticket_idx` ON `runs` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`status` text NOT NULL,
	`assignee` text,
	`url` text NOT NULL,
	`raw_json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`external_updated_at` integer,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_conn_external_uniq` ON `tickets` (`connection_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `tickets_key_idx` ON `tickets` (`key`);