ALTER TABLE "weekly_reports" RENAME COLUMN "ai_summary" TO "summary";--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD COLUMN "summary_html" text;--> statement-breakpoint
ALTER TABLE "weekly_reports" DROP COLUMN IF EXISTS "highlights";--> statement-breakpoint
ALTER TABLE "weekly_reports" DROP COLUMN IF EXISTS "metrics";
