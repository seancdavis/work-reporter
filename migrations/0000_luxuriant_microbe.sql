CREATE TABLE "daily_standups" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"yesterday_summary" text,
	"yesterday_summary_html" text,
	"today_plan" text,
	"today_plan_html" text,
	"blockers" text,
	"blockers_html" text,
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
CREATE TABLE "research_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"linear_issue_id" text NOT NULL,
	"linear_issue_identifier" text NOT NULL,
	"linear_issue_title" text NOT NULL,
	"linear_issue_url" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"description_html" text,
	"column" text DEFAULT 'ideas' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"planned_issue_id" text,
	"planned_issue_identifier" text,
	"planned_issue_title" text,
	"planned_issue_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "research_items_linear_issue_id_unique" UNIQUE("linear_issue_id")
);
--> statement-breakpoint
CREATE TABLE "research_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_item_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"created_at" timestamp DEFAULT now()
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
	"summary" text,
	"summary_html" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_reports_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "weekly_standups" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"planned_accomplishments" text,
	"planned_accomplishments_html" text,
	"linked_issues" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_standups_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;