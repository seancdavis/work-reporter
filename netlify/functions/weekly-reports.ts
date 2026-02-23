import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, gte, lte, asc, desc } from "drizzle-orm";
import { requireAdmin } from "./_shared/auth";
import { generateWeeklySummary } from "./_shared/ai";
import { formatDate, getWeekStart, getWeekEnd } from "./_shared/utils";
import { parseMarkdown } from "./_shared/markdown";

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
        summary: r.summary,
        summary_html: r.summaryHtml,
        linked_issues: r.linkedIssues || [],
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      return Response.json({ error: "Failed to fetch weekly reports" }, { status: 500 });
    }
  }

  // POST /api/weekly-reports/generate - Generate AI summary (returns text, doesn't save)
  if (request.method === "POST" && url.pathname.endsWith("/generate")) {
    const auth = await requireAdmin(request);
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

      // Fetch weekly standup (planning)
      const weeklyStandups = await db
        .select()
        .from(schema.weeklyStandups)
        .where(eq(schema.weeklyStandups.weekStart, week_start));

      if (dailyStandups.length === 0) {
        return Response.json({ error: "No daily standups found for the selected week" }, { status: 400 });
      }

      // Generate AI summary
      const generated = await generateWeeklySummary(
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
            }
          : undefined
      );

      return Response.json({ generated });
    } catch (error) {
      console.error("Error generating weekly report:", error);
      return Response.json({ error: "Failed to generate weekly report" }, { status: 500 });
    }
  }

  // POST /api/weekly-reports - Save/update a report
  if (request.method === "POST") {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { week_start, summary, linked_issues } = body as {
        week_start: string;
        summary?: string;
        linked_issues?: Array<{ id: string; identifier: string; title: string }>;
      };

      if (!week_start) {
        return Response.json({ error: "week_start is required" }, { status: 400 });
      }

      // Parse markdown to HTML
      const summaryHtml = parseMarkdown(summary);

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
            summary: summary || null,
            summaryHtml: summaryHtml,
            linkedIssues: linked_issues || [],
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
            summary: summary || null,
            summaryHtml: summaryHtml,
            linkedIssues: linked_issues || [],
          })
          .returning();
        result = inserted[0];
      }

      return Response.json({
        id: result.id,
        week_start: result.weekStart,
        summary: result.summary,
        summary_html: result.summaryHtml,
        linked_issues: result.linkedIssues || [],
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
  path: ["/api/weekly-reports", "/api/weekly-reports/*"],
};
