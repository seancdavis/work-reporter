import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";

// Valid columns for the kanban board
const VALID_COLUMNS = ["backlog", "exploring", "deep_dive", "synthesizing", "parked"] as const;
type Column = (typeof VALID_COLUMNS)[number];

function isValidColumn(column: string): column is Column {
  return VALID_COLUMNS.includes(column as Column);
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // GET /api/research - List all research items
  if (request.method === "GET") {
    try {
      const items = await db
        .select()
        .from(schema.researchItems)
        .orderBy(asc(schema.researchItems.displayOrder));

      // Convert to snake_case for API compatibility
      const result = items.map((item) => ({
        id: item.id,
        linear_issue_id: item.linearIssueId,
        linear_issue_identifier: item.linearIssueIdentifier,
        linear_issue_title: item.linearIssueTitle,
        linear_issue_url: item.linearIssueUrl,
        column: item.column,
        display_order: item.displayOrder,
        notes: item.notes,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      }));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching research items:", error);
      return Response.json({ error: "Failed to fetch research items" }, { status: 500 });
    }
  }

  // POST /api/research - Add a new research item (from Linear issue)
  if (request.method === "POST") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        linear_issue_id,
        linear_issue_identifier,
        linear_issue_title,
        linear_issue_url,
        column = "backlog",
        notes,
      } = body as {
        linear_issue_id: string;
        linear_issue_identifier: string;
        linear_issue_title: string;
        linear_issue_url: string;
        column?: string;
        notes?: string;
      };

      if (!linear_issue_id || !linear_issue_identifier || !linear_issue_title || !linear_issue_url) {
        return Response.json({ error: "Linear issue details are required" }, { status: 400 });
      }

      if (!isValidColumn(column)) {
        return Response.json({ error: `Invalid column. Must be one of: ${VALID_COLUMNS.join(", ")}` }, { status: 400 });
      }

      // Check if issue already exists on the board
      const existing = await db
        .select()
        .from(schema.researchItems)
        .where(eq(schema.researchItems.linearIssueId, linear_issue_id))
        .limit(1);

      if (existing.length > 0) {
        return Response.json({ error: "This issue is already on the research board" }, { status: 400 });
      }

      // Get max display order for the column
      const itemsInColumn = await db
        .select()
        .from(schema.researchItems)
        .where(eq(schema.researchItems.column, column));

      const maxOrder = itemsInColumn.reduce((max, item) => Math.max(max, item.displayOrder), -1);

      const inserted = await db
        .insert(schema.researchItems)
        .values({
          linearIssueId: linear_issue_id,
          linearIssueIdentifier: linear_issue_identifier,
          linearIssueTitle: linear_issue_title,
          linearIssueUrl: linear_issue_url,
          column,
          displayOrder: maxOrder + 1,
          notes: notes || null,
        })
        .returning();

      const result = inserted[0];

      return Response.json({
        id: result.id,
        linear_issue_id: result.linearIssueId,
        linear_issue_identifier: result.linearIssueIdentifier,
        linear_issue_title: result.linearIssueTitle,
        linear_issue_url: result.linearIssueUrl,
        column: result.column,
        display_order: result.displayOrder,
        notes: result.notes,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating research item:", error);
      return Response.json({ error: "Failed to create research item" }, { status: 500 });
    }
  }

  // PUT /api/research?id=X - Update a research item (move, reorder, add notes)
  if (request.method === "PUT") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const idParam = url.searchParams.get("id");
      if (!idParam) {
        return Response.json({ error: "ID parameter required" }, { status: 400 });
      }

      const body = await request.json();
      const { column, display_order, notes } = body as {
        column?: string;
        display_order?: number;
        notes?: string;
      };

      if (column !== undefined && !isValidColumn(column)) {
        return Response.json({ error: `Invalid column. Must be one of: ${VALID_COLUMNS.join(", ")}` }, { status: 400 });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (column !== undefined) updateData.column = column;
      if (display_order !== undefined) updateData.displayOrder = display_order;
      if (notes !== undefined) updateData.notes = notes || null;

      const updated = await db
        .update(schema.researchItems)
        .set(updateData)
        .where(eq(schema.researchItems.id, parseInt(idParam)))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Research item not found" }, { status: 404 });
      }

      const result = updated[0];

      return Response.json({
        id: result.id,
        linear_issue_id: result.linearIssueId,
        linear_issue_identifier: result.linearIssueIdentifier,
        linear_issue_title: result.linearIssueTitle,
        linear_issue_url: result.linearIssueUrl,
        column: result.column,
        display_order: result.displayOrder,
        notes: result.notes,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    } catch (error) {
      console.error("Error updating research item:", error);
      return Response.json({ error: "Failed to update research item" }, { status: 500 });
    }
  }

  // PATCH /api/research/reorder - Batch reorder items
  if (request.method === "PATCH") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { items } = body as {
        items: Array<{ id: number; column: string; display_order: number }>;
      };

      if (!items || !Array.isArray(items)) {
        return Response.json({ error: "Items array required" }, { status: 400 });
      }

      // Update each item's position
      for (const item of items) {
        if (!isValidColumn(item.column)) {
          return Response.json({ error: `Invalid column for item ${item.id}` }, { status: 400 });
        }

        await db
          .update(schema.researchItems)
          .set({
            column: item.column,
            displayOrder: item.display_order,
            updatedAt: new Date(),
          })
          .where(eq(schema.researchItems.id, item.id));
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error reordering research items:", error);
      return Response.json({ error: "Failed to reorder items" }, { status: 500 });
    }
  }

  // DELETE /api/research?id=X - Remove item from board
  if (request.method === "DELETE") {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const idParam = url.searchParams.get("id");
      if (!idParam) {
        return Response.json({ error: "ID parameter required" }, { status: 400 });
      }

      await db
        .delete(schema.researchItems)
        .where(eq(schema.researchItems.id, parseInt(idParam)));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting research item:", error);
      return Response.json({ error: "Failed to delete research item" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/research",
};
