ALTER TABLE `connections` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `connections` ADD `last_sync_cursor` text;--> statement-breakpoint
ALTER TABLE `connections` ADD `sync_interval_ms` integer DEFAULT 300000 NOT NULL;