CREATE TABLE "impact_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"description_html" text,
	"shipped_date" date NOT NULL,
	"linear_issue_id" text,
	"linear_issue_identifier" text,
	"linear_issue_title" text,
	"linear_issue_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "impact_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"impact_item_id" integer NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "impact_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"impact_item_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "impact_links" ADD CONSTRAINT "impact_links_impact_item_id_impact_items_id_fk" FOREIGN KEY ("impact_item_id") REFERENCES "public"."impact_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_notes" ADD CONSTRAINT "impact_notes_impact_item_id_impact_items_id_fk" FOREIGN KEY ("impact_item_id") REFERENCES "public"."impact_items"("id") ON DELETE cascade ON UPDATE no action;