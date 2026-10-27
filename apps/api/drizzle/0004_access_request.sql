CREATE TABLE "access_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"use_case" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_request_email_unique" UNIQUE("email"),
	CONSTRAINT "access_request_email_lowercase" CHECK ("access_request"."email" = lower("access_request"."email"))
);
--> statement-breakpoint
ALTER TABLE "access_request" ENABLE ROW LEVEL SECURITY;