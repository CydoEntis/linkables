CREATE TABLE `access_request` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`use_case` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	CONSTRAINT "access_request_email_lowercase" CHECK("access_request"."email" = lower("access_request"."email"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_request_email_unique` ON `access_request` (`email`);--> statement-breakpoint
CREATE TABLE `collection` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	`last_used_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	`share_token` text,
	`share_ungrouped` integer DEFAULT true NOT NULL,
	`share_private` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_share_token_unique` ON `collection` (`share_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `collection_user_id_lower_name_unique` ON `collection` (`user_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `collection_group` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`shared` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_group_collection_id_lower_name_unique` ON `collection_group` (`collection_id`,lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `collection_group_collection_id_id_unique` ON `collection_group` (`collection_id`,`id`);--> statement-breakpoint
CREATE TABLE `collection_item` (
	`collection_id` text NOT NULL,
	`saved_link_id` text NOT NULL,
	`group_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	PRIMARY KEY(`collection_id`, `saved_link_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`saved_link_id`) REFERENCES `saved_link`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`,`group_id`) REFERENCES `collection_group`(`collection_id`,`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `resource_reader` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`article` text,
	`reason` text,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resource`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "resource_reader_article_when_ok" CHECK(("resource_reader"."status" = 'ok') = ("resource_reader"."article" is not null))
);
--> statement-breakpoint
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
CREATE UNIQUE INDEX `saved_link_user_id_resource_id_unique` ON `saved_link` (`user_id`,`resource_id`);--> statement-breakpoint
CREATE TABLE `share_allowed_email` (
	`collection_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	PRIMARY KEY(`collection_id`, `email`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `share_code` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`email` text NOT NULL,
	`salt` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_code_collection_id_email_unique` ON `share_code` (`collection_id`,`email`);--> statement-breakpoint
CREATE TABLE `share_viewer_session` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `share_viewer_session_collection_id_idx` ON `share_viewer_session` (`collection_id`);