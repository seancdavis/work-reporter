ALTER TABLE "kudos" ADD COLUMN "message_html" text;--> statement-breakpoint
ALTER TABLE "kudos" ADD COLUMN "context_html" text;--> statement-breakpoint
ALTER TABLE "kudos" ADD COLUMN "show_screenshot" integer DEFAULT 0;