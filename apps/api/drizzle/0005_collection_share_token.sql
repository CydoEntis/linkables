ALTER TABLE "collection" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_share_token_unique" UNIQUE("share_token");