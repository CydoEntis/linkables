CREATE TYPE "public"."reader_status" AS ENUM('ok', 'unavailable');--> statement-breakpoint
CREATE TABLE "resource_reader" (
	"resource_id" uuid PRIMARY KEY NOT NULL,
	"status" "reader_status" NOT NULL,
	"article" jsonb,
	"reason" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_reader_article_when_ok" CHECK (("resource_reader"."status" = 'ok') = ("resource_reader"."article" is not null))
);
--> statement-breakpoint
ALTER TABLE "resource_reader" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resource_reader" ADD CONSTRAINT "resource_reader_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;