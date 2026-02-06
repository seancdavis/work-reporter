CREATE TABLE "research_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_item_id" integer NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "linear_issue_priority" integer;--> statement-breakpoint
ALTER TABLE "research_items" ADD COLUMN "linear_issue_priority_label" text;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "research_documents" ADD CONSTRAINT "research_documents_research_item_id_research_items_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "public"."research_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "research_items" SET "column" = 'closed' WHERE "column" = 'implemented';--> statement-breakpoint
UPDATE "research_items" SET "column" = 'discussing' WHERE "column" = 'planned';