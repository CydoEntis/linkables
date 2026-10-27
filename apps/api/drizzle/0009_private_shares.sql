CREATE TABLE "share_allowed_email" (
	"collection_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_allowed_email_collection_id_email_pk" PRIMARY KEY("collection_id","email")
);
--> statement-breakpoint
ALTER TABLE "share_allowed_email" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "share_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"email" text NOT NULL,
	"salt" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_code_collection_id_email_unique" UNIQUE("collection_id","email")
);
--> statement-breakpoint
ALTER TABLE "share_code" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "share_viewer_session" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"collection_id" uuid NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_viewer_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "share_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "share_allowed_email" ADD CONSTRAINT "share_allowed_email_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_code" ADD CONSTRAINT "share_code_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_viewer_session" ADD CONSTRAINT "share_viewer_session_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "share_viewer_session_collection_id_idx" ON "share_viewer_session" USING btree ("collection_id");