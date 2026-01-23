ALTER TABLE "weekly_standups" ADD COLUMN "planned_accomplishments_html" text;--> statement-breakpoint
ALTER TABLE "weekly_standups" DROP COLUMN IF EXISTS "goals";
