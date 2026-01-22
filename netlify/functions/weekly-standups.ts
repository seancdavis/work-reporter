import type { Context } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, gte, desc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { jsonResponse, errorResponse, handleCors, corsHeaders, formatDate, getWeekStart } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);

  // GET /api/weekly-standups - List weekly standups
  if (request.method === "GET") {
    try {
      const weekParam = url.searchParams.get("week");

      let standups;

      if (weekParam) {
        // Get specific week
        standups = await db
          .select()
          .from(schema.weeklyStandups)
          .where(eq(schema.weeklyStandups.weekStart, weekParam));
      } else {
        // Get recent weeks (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        standups = await db
          .select()
          .from(schema.weeklyStandups)
          .where(gte(schema.weeklyStandups.weekStart, formatDate(getWeekStart(eightWeeksAgo))))
          .orderBy(desc(schema.weeklyStandups.weekStart));
      }

      // Convert to snake_case for API compatibility
      const result = standups.map((s) => ({
        id: s.id,
        week_start: s.weekStart,
        planned_accomplishments: s.plannedAccomplishments,
        goals: s.goals,
        linked_issues: s.linkedIssues,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }));

      return jsonResponse(result, 200, corsHeaders());
    } catch (error) {
      console.error("Error fetching weekly standups:", error);
      return errorResponse("Failed to fetch weekly standups", 500);
    }
  }

  // POST /api/weekly-standups - Create or update a weekly standup
  if (request.method === "POST") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) return auth.response!;

    try {
      const body = await request.json();
      const {
        week_start,
        planned_accomplishments,
        goals = [],
        linked_issues = [],
      } = body as {
        week_start: string;
        planned_accomplishments?: string;
        goals?: string[];
        linked_issues?: Array<{ id: string; identifier: string; title: string }>;
      };

      if (!week_start) {
        return errorResponse("week_start is required", 400);
      }

      // Check if standup exists for this week
      const existing = await db
        .select()
        .from(schema.weeklyStandups)
        .where(eq(schema.weeklyStandups.weekStart, week_start))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update
        const updated = await db
          .update(schema.weeklyStandups)
          .set({
            plannedAccomplishments: planned_accomplishments || null,
            goals: goals,
            linkedIssues: linked_issues,
            updatedAt: new Date(),
          })
          .where(eq(schema.weeklyStandups.weekStart, week_start))
          .returning();
        result = updated[0];
      } else {
        // Insert
        const inserted = await db
          .insert(schema.weeklyStandups)
          .values({
            weekStart: week_start,
            plannedAccomplishments: planned_accomplishments || null,
            goals: goals,
            linkedIssues: linked_issues,
          })
          .returning();
        result = inserted[0];
      }

      return jsonResponse({
        id: result.id,
        week_start: result.weekStart,
        planned_accomplishments: result.plannedAccomplishments,
        goals: result.goals,
        linked_issues: result.linkedIssues,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      }, 200, corsHeaders());
    } catch (error) {
      console.error("Error saving weekly standup:", error);
      return errorResponse("Failed to save weekly standup", 500);
    }
  }

  // DELETE /api/weekly-standups?week=YYYY-MM-DD
  if (request.method === "DELETE") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) return auth.response!;

    try {
      const weekParam = url.searchParams.get("week");
      if (!weekParam) {
        return errorResponse("Week parameter required", 400);
      }

      await db
        .delete(schema.weeklyStandups)
        .where(eq(schema.weeklyStandups.weekStart, weekParam));

      return jsonResponse({ success: true }, 200, corsHeaders());
    } catch (error) {
      console.error("Error deleting weekly standup:", error);
      return errorResponse("Failed to delete weekly standup", 500);
    }
  }

  return errorResponse("Method not allowed", 405);
};
