import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, gte, lte, asc, desc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { generateWeeklySummary } from "./_shared/ai";
import { formatDate, getWeekStart, getWeekEnd } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // GET /api/weekly-reports - List weekly reports
  if (request.method === "GET") {
    try {
      const weekParam = url.searchParams.get("week");

      let reports;

      if (weekParam) {
        // Get specific week
        reports = await db
          .select()
          .from(schema.weeklyReports)
          .where(eq(schema.weeklyReports.weekStart, weekParam));
      } else {
        // Get recent reports (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        reports = await db
          .select()
          .from(schema.weeklyReports)
          .where(gte(schema.weeklyReports.weekStart, formatDate(getWeekStart(eightWeeksAgo))))
          .orderBy(desc(schema.weeklyReports.weekStart));
      }

      // Convert to snake_case for API compatibility
      const result = reports.map((r) => ({
        id: r.id,
        week_start: r.weekStart,
        ai_summary: r.aiSummary,
        highlights: r.highlights,
        metrics: r.metrics,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      return Response.json({ error: "Failed to fetch weekly reports" }, { status: 500 });
    }
  }

  // POST /api/weekly-reports/generate - Generate AI summary for a week
  if (request.method === "POST" && url.pathname.endsWith("/generate")) {
    const auth = await requireAuth(context, "admin", request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { week_start } = body as { week_start: string };

      if (!week_start) {
        return Response.json({ error: "week_start is required" }, { status: 400 });
      }

      const weekStartDate = new Date(week_start + "T00:00:00");
      const weekEndDate = getWeekEnd(weekStartDate);

      // Fetch daily standups for the week
      const dailyStandups = await db
        .select()
        .from(schema.dailyStandups)
        .where(gte(schema.dailyStandups.date, formatDate(weekStartDate)))
        .where(lte(schema.dailyStandups.date, formatDate(weekEndDate)))
        .orderBy(asc(schema.dailyStandups.date));

      // Fetch weekly standup prediction
      const weeklyStandups = await db
        .select()
        .from(schema.weeklyStandups)
        .where(eq(schema.weeklyStandups.weekStart, week_start));

      if (dailyStandups.length === 0) {
        return Response.json({ error: "No daily standups found for this week" }, { status: 400 });
      }

      // Generate AI summary
      const { summary, highlights, metrics } = await generateWeeklySummary(
        dailyStandups.map((d) => ({
          date: d.date,
          yesterday_summary: d.yesterdaySummary || "",
          today_plan: d.todayPlan || "",
          blockers: d.blockers || "",
          linked_issues: (d.linkedIssues as Array<{ identifier: string; title: string }>) || [],
        })),
        weeklyStandups[0]
          ? {
              planned_accomplishments: weeklyStandups[0].plannedAccomplishments || "",
              goals: (weeklyStandups[0].goals as string[]) || [],
            }
          : undefined
      );

      // Check if report exists
      const existing = await db
        .select()
        .from(schema.weeklyReports)
        .where(eq(schema.weeklyReports.weekStart, week_start))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update
        const updated = await db
          .update(schema.weeklyReports)
          .set({
            aiSummary: summary,
            highlights: highlights,
            metrics: metrics,
            updatedAt: new Date(),
          })
          .where(eq(schema.weeklyReports.weekStart, week_start))
          .returning();
        result = updated[0];
      } else {
        // Insert
        const inserted = await db
          .insert(schema.weeklyReports)
          .values({
            weekStart: week_start,
            aiSummary: summary,
            highlights: highlights,
            metrics: metrics,
          })
          .returning();
        result = inserted[0];
      }

      return Response.json({
        id: result.id,
        week_start: result.weekStart,
        ai_summary: result.aiSummary,
        highlights: result.highlights,
        metrics: result.metrics,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    } catch (error) {
      console.error("Error generating weekly report:", error);
      return Response.json({ error: "Failed to generate weekly report" }, { status: 500 });
    }
  }

  // POST /api/weekly-reports - Manually save/update a report
  if (request.method === "POST") {
    const auth = await requireAuth(context, "admin", request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        week_start,
        ai_summary,
        highlights = [],
        metrics = {},
      } = body as {
        week_start: string;
        ai_summary?: string;
        highlights?: string[];
        metrics?: Record<string, unknown>;
      };

      if (!week_start) {
        return Response.json({ error: "week_start is required" }, { status: 400 });
      }

      // Check if report exists
      const existing = await db
        .select()
        .from(schema.weeklyReports)
        .where(eq(schema.weeklyReports.weekStart, week_start))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update
        const updated = await db
          .update(schema.weeklyReports)
          .set({
            aiSummary: ai_summary || null,
            highlights: highlights,
            metrics: metrics,
            updatedAt: new Date(),
          })
          .where(eq(schema.weeklyReports.weekStart, week_start))
          .returning();
        result = updated[0];
      } else {
        // Insert
        const inserted = await db
          .insert(schema.weeklyReports)
          .values({
            weekStart: week_start,
            aiSummary: ai_summary || null,
            highlights: highlights,
            metrics: metrics,
          })
          .returning();
        result = inserted[0];
      }

      return Response.json({
        id: result.id,
        week_start: result.weekStart,
        ai_summary: result.aiSummary,
        highlights: result.highlights,
        metrics: result.metrics,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    } catch (error) {
      console.error("Error saving weekly report:", error);
      return Response.json({ error: "Failed to save weekly report" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/weekly-reports",
};
