CREATE TABLE "research_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"linear_issue_id" text NOT NULL,
	"linear_issue_identifier" text NOT NULL,
	"linear_issue_title" text NOT NULL,
	"linear_issue_url" text NOT NULL,
	"column" text DEFAULT 'backlog' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "research_items_linear_issue_id_unique" UNIQUE("linear_issue_id")
);
