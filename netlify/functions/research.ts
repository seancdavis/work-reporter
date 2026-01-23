import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { parseMarkdown } from "./_shared/markdown";

// Valid columns for the kanban board
const VALID_COLUMNS = ["ideas", "exploring", "planned", "implemented", "closed"] as const;
type Column = (typeof VALID_COLUMNS)[number];

function isValidColumn(column: string): column is Column {
  return VALID_COLUMNS.includes(column as Column);
}

// Helper to format research item for API response
function formatResearchItem(item: typeof schema.researchItems.$inferSelect, notes: Array<typeof schema.researchNotes.$inferSelect> = []) {
  return {
    id: item.id,
    linear_issue_id: item.linearIssueId,
    linear_issue_identifier: item.linearIssueIdentifier,
    linear_issue_title: item.linearIssueTitle,
    linear_issue_url: item.linearIssueUrl,
    title: item.title,
    description: item.description,
    description_html: item.descriptionHtml,
    column: item.column,
    display_order: item.displayOrder,
    planned_issue_id: item.plannedIssueId,
    planned_issue_identifier: item.plannedIssueIdentifier,
    planned_issue_title: item.plannedIssueTitle,
    planned_issue_url: item.plannedIssueUrl,
    notes: notes.map(note => ({
      id: note.id,
      research_item_id: note.researchItemId,
      content: note.content,
      content_html: note.contentHtml,
      created_at: note.createdAt,
    })),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["api", "research"] or ["api", "research", ":id"] or ["api", "research", ":id", "notes"]

  const itemIdFromPath = pathParts.length >= 3 ? parseInt(pathParts[2]) : null;
  const isNotesEndpoint = pathParts.length >= 4 && pathParts[3] === "notes";
  const noteIdFromPath = pathParts.length >= 5 ? parseInt(pathParts[4]) : null;

  // GET /api/research - List all research items with notes
  if (request.method === "GET" && !itemIdFromPath) {
    try {
      const items = await db
        .select()
        .from(schema.researchItems)
        .orderBy(asc(schema.researchItems.displayOrder));

      // Fetch all notes
      const allNotes = await db
        .select()
        .from(schema.researchNotes)
        .orderBy(asc(schema.researchNotes.createdAt));

      // Group notes by research item id
      const notesByItemId = new Map<number, Array<typeof schema.researchNotes.$inferSelect>>();
      for (const note of allNotes) {
        const existing = notesByItemId.get(note.researchItemId) || [];
        existing.push(note);
        notesByItemId.set(note.researchItemId, existing);
      }

      const result = items.map((item) => formatResearchItem(item, notesByItemId.get(item.id) || []));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching research items:", error);
      return Response.json({ error: "Failed to fetch research items" }, { status: 500 });
    }
  }

  // GET /api/research/:id - Get single research item with notes
  if (request.method === "GET" && itemIdFromPath && !isNotesEndpoint) {
    try {
      const items = await db
        .select()
        .from(schema.researchItems)
        .where(eq(schema.researchItems.id, itemIdFromPath))
        .limit(1);

      if (items.length === 0) {
        return Response.json({ error: "Research item not found" }, { status: 404 });
      }

      const notes = await db
        .select()
        .from(schema.researchNotes)
        .where(eq(schema.researchNotes.researchItemId, itemIdFromPath))
        .orderBy(asc(schema.researchNotes.createdAt));

      return Response.json(formatResearchItem(items[0], notes));
    } catch (error) {
      console.error("Error fetching research item:", error);
      return Response.json({ error: "Failed to fetch research item" }, { status: 500 });
    }
  }

  // POST /api/research - Add a new research item (from Linear issue)
  if (request.method === "POST" && !itemIdFromPath) {
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
        linear_issue_description,
        title,
        description,
        column = "ideas",
      } = body as {
        linear_issue_id: string;
        linear_issue_identifier: string;
        linear_issue_title: string;
        linear_issue_url: string;
        linear_issue_description?: string;
        title?: string;
        description?: string;
        column?: string;
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

      // Use provided title/description or fall back to Linear issue values
      const finalTitle = title || linear_issue_title;
      const finalDescription = description || linear_issue_description || null;

      const inserted = await db
        .insert(schema.researchItems)
        .values({
          linearIssueId: linear_issue_id,
          linearIssueIdentifier: linear_issue_identifier,
          linearIssueTitle: linear_issue_title,
          linearIssueUrl: linear_issue_url,
          title: finalTitle,
          description: finalDescription,
          descriptionHtml: parseMarkdown(finalDescription),
          column,
          displayOrder: maxOrder + 1,
        })
        .returning();

      const result = inserted[0];

      return Response.json(formatResearchItem(result, []), { status: 201 });
    } catch (error) {
      console.error("Error creating research item:", error);
      return Response.json({ error: "Failed to create research item" }, { status: 500 });
    }
  }

  // POST /api/research/:id/notes - Add a note to a research item
  if (request.method === "POST" && itemIdFromPath && isNotesEndpoint) {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { content } = body as { content: string };

      if (!content?.trim()) {
        return Response.json({ error: "Content is required" }, { status: 400 });
      }

      // Verify the research item exists
      const items = await db
        .select()
        .from(schema.researchItems)
        .where(eq(schema.researchItems.id, itemIdFromPath))
        .limit(1);

      if (items.length === 0) {
        return Response.json({ error: "Research item not found" }, { status: 404 });
      }

      const inserted = await db
        .insert(schema.researchNotes)
        .values({
          researchItemId: itemIdFromPath,
          content: content.trim(),
          contentHtml: parseMarkdown(content.trim()),
        })
        .returning();

      const note = inserted[0];

      return Response.json({
        id: note.id,
        research_item_id: note.researchItemId,
        content: note.content,
        content_html: note.contentHtml,
        created_at: note.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating note:", error);
      return Response.json({ error: "Failed to create note" }, { status: 500 });
    }
  }

  // PUT /api/research/:id - Update a research item
  if (request.method === "PUT" && itemIdFromPath && !isNotesEndpoint) {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        column,
        display_order,
        title,
        description,
        planned_issue_id,
        planned_issue_identifier,
        planned_issue_title,
        planned_issue_url,
      } = body as {
        column?: string;
        display_order?: number;
        title?: string;
        description?: string;
        planned_issue_id?: string | null;
        planned_issue_identifier?: string | null;
        planned_issue_title?: string | null;
        planned_issue_url?: string | null;
      };

      if (column !== undefined && !isValidColumn(column)) {
        return Response.json({ error: `Invalid column. Must be one of: ${VALID_COLUMNS.join(", ")}` }, { status: 400 });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (column !== undefined) updateData.column = column;
      if (display_order !== undefined) updateData.displayOrder = display_order;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) {
        updateData.description = description || null;
        updateData.descriptionHtml = parseMarkdown(description);
      }
      if (planned_issue_id !== undefined) updateData.plannedIssueId = planned_issue_id || null;
      if (planned_issue_identifier !== undefined) updateData.plannedIssueIdentifier = planned_issue_identifier || null;
      if (planned_issue_title !== undefined) updateData.plannedIssueTitle = planned_issue_title || null;
      if (planned_issue_url !== undefined) updateData.plannedIssueUrl = planned_issue_url || null;

      const updated = await db
        .update(schema.researchItems)
        .set(updateData)
        .where(eq(schema.researchItems.id, itemIdFromPath))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Research item not found" }, { status: 404 });
      }

      // Fetch notes for the item
      const notes = await db
        .select()
        .from(schema.researchNotes)
        .where(eq(schema.researchNotes.researchItemId, itemIdFromPath))
        .orderBy(asc(schema.researchNotes.createdAt));

      return Response.json(formatResearchItem(updated[0], notes));
    } catch (error) {
      console.error("Error updating research item:", error);
      return Response.json({ error: "Failed to update research item" }, { status: 500 });
    }
  }

  // PATCH /api/research - Batch reorder items (kept for backward compatibility)
  if (request.method === "PATCH" && !itemIdFromPath) {
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

  // DELETE /api/research/:id - Remove item from board
  if (request.method === "DELETE" && itemIdFromPath && !isNotesEndpoint) {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.researchItems)
        .where(eq(schema.researchItems.id, itemIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting research item:", error);
      return Response.json({ error: "Failed to delete research item" }, { status: 500 });
    }
  }

  // DELETE /api/research/:id/notes/:noteId - Delete a note
  if (request.method === "DELETE" && itemIdFromPath && isNotesEndpoint && noteIdFromPath) {
    const auth = await requireAuth(request, "admin");
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.researchNotes)
        .where(eq(schema.researchNotes.id, noteIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      return Response.json({ error: "Failed to delete note" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/research", "/api/research/*"],
};
