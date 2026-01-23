import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NETLIFY_DATABASE_URL!);

async function runMigration() {
  console.log("Running research revamp migration...");

  try {
    // Check if title column already exists
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'research_items'
    `;
    const columnNames = columns.map((c: { column_name: string }) => c.column_name);
    console.log("Current columns:", columnNames);

    if (columnNames.includes("title")) {
      console.log("Migration already applied (title column exists)");
      return;
    }

    console.log("Adding new columns...");

    // Add new columns
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "title" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "description" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "description_html" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "planned_issue_id" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "planned_issue_identifier" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "planned_issue_title" text`;
    await sql`ALTER TABLE "research_items" ADD COLUMN IF NOT EXISTS "planned_issue_url" text`;

    console.log("Populating title from linear_issue_title...");
    await sql`UPDATE "research_items" SET "title" = "linear_issue_title" WHERE "title" IS NULL`;

    console.log("Making title NOT NULL...");
    await sql`ALTER TABLE "research_items" ALTER COLUMN "title" SET NOT NULL`;

    console.log("Migrating column values...");
    await sql`UPDATE "research_items" SET "column" = 'ideas' WHERE "column" = 'backlog'`;
    await sql`UPDATE "research_items" SET "column" = 'closed' WHERE "column" IN ('deep_dive', 'synthesizing', 'parked')`;
    await sql`ALTER TABLE "research_items" ALTER COLUMN "column" SET DEFAULT 'ideas'`;

    console.log("Creating research_notes table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "research_notes" (
        "id" serial PRIMARY KEY NOT NULL,
        "research_item_id" integer NOT NULL,
        "content" text NOT NULL,
        "content_html" text,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "research_notes_research_item_id_fk" FOREIGN KEY ("research_item_id") REFERENCES "research_items"("id") ON DELETE CASCADE
      )
    `;

    // Check if notes column exists before migrating
    const updatedColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'research_items' AND column_name = 'notes'
    `;

    if (updatedColumns.length > 0) {
      console.log("Migrating existing notes...");
      await sql`
        INSERT INTO "research_notes" ("research_item_id", "content", "created_at")
        SELECT "id", "notes", "created_at"
        FROM "research_items"
        WHERE "notes" IS NOT NULL AND "notes" != ''
      `;

      console.log("Dropping old notes column...");
      await sql`ALTER TABLE "research_items" DROP COLUMN "notes"`;
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
