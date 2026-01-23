-- Research board revamp migration

-- Add new columns to research_items
ALTER TABLE "research_items" ADD COLUMN "title" text;
ALTER TABLE "research_items" ADD COLUMN "description" text;
ALTER TABLE "research_items" ADD COLUMN "description_html" text;
ALTER TABLE "research_items" ADD COLUMN "planned_issue_id" text;
ALTER TABLE "research_items" ADD COLUMN "planned_issue_identifier" text;
ALTER TABLE "research_items" ADD COLUMN "planned_issue_title" text;
ALTER TABLE "research_items" ADD COLUMN "planned_issue_url" text;

-- Populate title from linear_issue_title for existing items
UPDATE "research_items" SET "title" = "linear_issue_title" WHERE "title" IS NULL;

-- Make title not null after populating
ALTER TABLE "research_items" ALTER COLUMN "title" SET NOT NULL;

-- Migrate column values: backlog -> ideas
UPDATE "research_items" SET "column" = 'ideas' WHERE "column" = 'backlog';

-- Migrate column values: deep_dive, synthesizing, parked -> closed
UPDATE "research_items" SET "column" = 'closed' WHERE "column" IN ('deep_dive', 'synthesizing', 'parked');

-- Change default for column
ALTER TABLE "research_items" ALTER COLUMN "column" SET DEFAULT 'ideas';

-- Remove old notes column (data will be migrated to research_notes table)
-- First, migrate any existing notes to the new table (will be done after creating the table)

-- Create research_notes table
CREATE TABLE IF NOT EXISTS "research_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_item_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "research_notes_research_item_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "research_items"("id") ON DELETE CASCADE
);

-- Migrate existing notes to research_notes table
INSERT INTO "research_notes" ("research_item_id", "content", "created_at")
SELECT "id", "notes", "created_at"
FROM "research_items"
WHERE "notes" IS NOT NULL AND "notes" != '';

-- Now drop the old notes column
ALTER TABLE "research_items" DROP COLUMN "notes";
