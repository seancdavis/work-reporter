import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { formatDate, getWeekEnd } from "./_shared/utils";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);

  // GET - List standups
  if (req.method === "GET") {
    try {
      const dateParam = url.searchParams.get("date");
      const weekParam = url.searchParams.get("week");

      let standups;

      if (dateParam) {
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(eq(schema.dailyStandups.date, dateParam))
          .orderBy(desc(schema.dailyStandups.date));
      } else if (weekParam) {
        const weekStart = new Date(weekParam + "T00:00:00");
        const weekEnd = getWeekEnd(weekStart);
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(gte(schema.dailyStandups.date, formatDate(weekStart)))
          .where(lte(schema.dailyStandups.date, formatDate(weekEnd)))
          .orderBy(desc(schema.dailyStandups.date));
      } else {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(gte(schema.dailyStandups.date, formatDate(twoWeeksAgo)))
          .orderBy(desc(schema.dailyStandups.date));
      }

      const result = standups.map((s) => ({
        id: s.id,
        date: s.date,
        yesterday_summary: s.yesterdaySummary,
        today_plan: s.todayPlan,
        blockers: s.blockers,
        linked_issues: s.linkedIssues,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching daily standups:", error);
      return Response.json({ error: "Failed to fetch standups" }, { status: 500 });
    }
  }

  // POST - Create or update standup
  if (req.method === "POST") {
    const auth = await requireAuth(req, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await req.json();
      const { date, yesterday_summary, today_plan, blockers, linked_issues = [] } = body as {
        date: string;
        yesterday_summary?: string;
        today_plan?: string;
        blockers?: string;
        linked_issues?: Array<{ id: string; identifier: string; title: string }>;
      };

      if (!date) {
        return Response.json({ error: "Date is required" }, { status: 400 });
      }

      const existing = await db
        .select()
        .from(schema.dailyStandups)
        .where(eq(schema.dailyStandups.date, date))
        .limit(1);

      let result;
      if (existing.length > 0) {
        const updated = await db
          .update(schema.dailyStandups)
          .set({
            yesterdaySummary: yesterday_summary || null,
            todayPlan: today_plan || null,
            blockers: blockers || null,
            linkedIssues: linked_issues,
            updatedAt: new Date(),
          })
          .where(eq(schema.dailyStandups.date, date))
          .returning();
        result = updated[0];
      } else {
        const inserted = await db
          .insert(schema.dailyStandups)
          .values({
            date,
            yesterdaySummary: yesterday_summary || null,
            todayPlan: today_plan || null,
            blockers: blockers || null,
            linkedIssues: linked_issues,
          })
          .returning();
        result = inserted[0];
      }

      return Response.json({
        id: result.id,
        date: result.date,
        yesterday_summary: result.yesterdaySummary,
        today_plan: result.todayPlan,
        blockers: result.blockers,
        linked_issues: result.linkedIssues,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    } catch (error) {
      console.error("Error saving daily standup:", error);
      return Response.json({ error: "Failed to save standup" }, { status: 500 });
    }
  }

  // DELETE
  if (req.method === "DELETE") {
    const auth = await requireAuth(req, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const dateParam = url.searchParams.get("date");
      if (!dateParam) {
        return Response.json({ error: "Date parameter required" }, { status: 400 });
      }

      await db.delete(schema.dailyStandups).where(eq(schema.dailyStandups.date, dateParam));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting daily standup:", error);
      return Response.json({ error: "Failed to delete standup" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/daily-standups",
};
