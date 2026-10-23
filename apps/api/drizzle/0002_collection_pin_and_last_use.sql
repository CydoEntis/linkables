ALTER TABLE "collection" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "last_used_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_item" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "collection" SET "last_used_at" = "created_at";--> statement-breakpoint
UPDATE "collection_item" SET "created_at" = "saved_link"."saved_at" FROM "saved_link" WHERE "saved_link"."id" = "collection_item"."saved_link_id";