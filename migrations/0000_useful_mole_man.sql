CREATE TABLE "daily_standups" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"yesterday_summary" text,
	"today_plan" text,
	"blockers" text,
	"linked_issues" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_standups_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "kudos" (
	"id" serial PRIMARY KEY NOT NULL,
	"received_date" date NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"context" text,
	"screenshot_blob_key" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"ai_summary" text,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_reports_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "weekly_standups" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"planned_accomplishments" text,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"linked_issues" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_standups_week_start_unique" UNIQUE("week_start")
);
