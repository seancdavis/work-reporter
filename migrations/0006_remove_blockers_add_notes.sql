ALTER TABLE "daily_standups" DROP COLUMN IF EXISTS "blockers";--> statement-breakpoint
ALTER TABLE "daily_standups" DROP COLUMN IF EXISTS "blockers_html";--> statement-breakpoint
ALTER TABLE "daily_standups" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "daily_standups" ADD COLUMN "notes_html" text;