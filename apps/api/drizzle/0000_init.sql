CREATE TYPE "public"."fetch_status" AS ENUM('pending', 'fetched', 'fetch_failed');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('video', 'page', 'other');--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "collection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collection_item" (
	"collection_id" uuid NOT NULL,
	"saved_link_id" uuid NOT NULL,
	CONSTRAINT "collection_item_collection_id_saved_link_id_pk" PRIMARY KEY("collection_id","saved_link_id")
);
--> statement-breakpoint
ALTER TABLE "collection_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_url" text NOT NULL,
	"final_url" text,
	"rel_canonical_url" text,
	"title" text,
	"description" text,
	"author" text,
	"favicon_url" text,
	"thumbnail_url" text,
	"content_type" text,
	"kind" "resource_kind",
	"fetch_status" "fetch_status" DEFAULT 'pending' NOT NULL,
	"fetch_error" text,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_canonical_url_unique" UNIQUE("canonical_url")
);
--> statement-breakpoint
ALTER TABLE "resource" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"original_url" text NOT NULL,
	"title_override" text,
	"note" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_link_user_id_resource_id_unique" UNIQUE("user_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "saved_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_saved_link_id_saved_link_id_fk" FOREIGN KEY ("saved_link_id") REFERENCES "public"."saved_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_link" ADD CONSTRAINT "saved_link_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_item_saved_link_id_idx" ON "collection_item" USING btree ("saved_link_id");