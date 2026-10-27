CREATE TABLE `collection` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	`last_used_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_user_id_lower_name_unique` ON `collection` (`user_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `collection_item` (
	`collection_id` text NOT NULL,
	`saved_link_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	PRIMARY KEY(`collection_id`, `saved_link_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`saved_link_id`) REFERENCES `saved_link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_item_saved_link_id_idx` ON `collection_item` (`saved_link_id`);--> statement-breakpoint
CREATE TABLE `job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resource_id` text NOT NULL,
	`run_after` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	`locked_until` text,
	`lease_token` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_url` text NOT NULL,
	`final_url` text,
	`rel_canonical_url` text,
	`title` text,
	`description` text,
	`author` text,
	`favicon_url` text,
	`thumbnail_url` text,
	`content_type` text,
	`kind` text,
	`fetch_status` text DEFAULT 'pending' NOT NULL,
	`fetch_error` text,
	`fetched_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_canonical_url_unique` ON `resource` (`canonical_url`);--> statement-breakpoint
CREATE TABLE `saved_link` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`original_url` text NOT NULL,
	`title_override` text,
	`note` text,
	`pinned` integer DEFAULT false NOT NULL,
	`saved_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	`saved_from` text,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `saved_link_user_id_idx` ON `saved_link` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `saved_link_user_id_resource_id_unique` ON `saved_link` (`user_id`,`resource_id`);