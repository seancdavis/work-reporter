import type { Context } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { jsonResponse, errorResponse, handleCors, corsHeaders, formatDate, getWeekStart, getWeekEnd } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);

  // GET /api/daily-standups - List standups (optionally filtered by date range)
  if (request.method === "GET") {
    try {
      const dateParam = url.searchParams.get("date");
      const weekParam = url.searchParams.get("week");

      let standups;

      if (dateParam) {
        // Get specific date
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(eq(schema.dailyStandups.date, dateParam))
          .orderBy(desc(schema.dailyStandups.date));
      } else if (weekParam) {
        // Get standups for a specific week (weekParam is the week start date)
        const weekStart = new Date(weekParam + "T00:00:00");
        const weekEnd = getWeekEnd(weekStart);
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(gte(schema.dailyStandups.date, formatDate(weekStart)))
          .where(lte(schema.dailyStandups.date, formatDate(weekEnd)))
          .orderBy(desc(schema.dailyStandups.date));
      } else {
        // Get recent standups (last 14 days)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        standups = await db
          .select()
          .from(schema.dailyStandups)
          .where(gte(schema.dailyStandups.date, formatDate(twoWeeksAgo)))
          .orderBy(desc(schema.dailyStandups.date));
      }

      // Convert to snake_case for API compatibility
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

      return jsonResponse(result, 200, corsHeaders());
    } catch (error) {
      console.error("Error fetching daily standups:", error);
      return errorResponse("Failed to fetch standups", 500);
    }
  }

  // POST /api/daily-standups - Create or update a standup
  if (request.method === "POST") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) return auth.response!;

    try {
      const body = await request.json();
      const {
        date,
        yesterday_summary,
        today_plan,
        blockers,
        linked_issues = [],
      } = body as {
        date: string;
        yesterday_summary?: string;
        today_plan?: string;
        blockers?: string;
        linked_issues?: Array<{ id: string; identifier: string; title: string }>;
      };

      if (!date) {
        return errorResponse("Date is required", 400);
      }

      // Check if standup exists for this date
      const existing = await db
        .select()
        .from(schema.dailyStandups)
        .where(eq(schema.dailyStandups.date, date))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update
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
        // Insert
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

      return jsonResponse({
        id: result.id,
        date: result.date,
        yesterday_summary: result.yesterdaySummary,
        today_plan: result.todayPlan,
        blockers: result.blockers,
        linked_issues: result.linkedIssues,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      }, 200, corsHeaders());
    } catch (error) {
      console.error("Error saving daily standup:", error);
      return errorResponse("Failed to save standup", 500);
    }
  }

  // DELETE /api/daily-standups?date=YYYY-MM-DD
  if (request.method === "DELETE") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) return auth.response!;

    try {
      const dateParam = url.searchParams.get("date");
      if (!dateParam) {
        return errorResponse("Date parameter required", 400);
      }

      await db
        .delete(schema.dailyStandups)
        .where(eq(schema.dailyStandups.date, dateParam));

      return jsonResponse({ success: true }, 200, corsHeaders());
    } catch (error) {
      console.error("Error deleting daily standup:", error);
      return errorResponse("Failed to delete standup", 500);
    }
  }

  return errorResponse("Method not allowed", 405);
};
