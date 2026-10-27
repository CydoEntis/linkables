CREATE TABLE "collection_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"shared" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_group_collection_id_id_unique" UNIQUE("collection_id","id")
);
--> statement-breakpoint
ALTER TABLE "collection_group" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_item" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_group" ADD CONSTRAINT "collection_group_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_group_collection_id_lower_name_unique" ON "collection_group" USING btree ("collection_id",lower("name"));--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_group_fk" FOREIGN KEY ("collection_id","group_id") REFERENCES "public"."collection_group"("collection_id","id") ON DELETE set null ("group_id") ON UPDATE no action;