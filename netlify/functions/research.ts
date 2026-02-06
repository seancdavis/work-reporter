import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "./_shared/auth";
import { parseMarkdown } from "./_shared/markdown";
import { updateIssueTitle, updateIssueDescription, addComment, updateComment, updateIssueState, getIssueTeamId, getWorkflowStates, getIssuesByIds } from "./_shared/linear";
import { inArray } from "drizzle-orm";

// Valid columns for the kanban board
const VALID_COLUMNS = ["ideas", "exploring", "discussing", "closed"] as const;
type Column = (typeof VALID_COLUMNS)[number];

function isValidColumn(column: string): column is Column {
  return VALID_COLUMNS.includes(column as Column);
}

// Column → Linear state type mapping
const COLUMN_TO_STATE_TYPE: Record<string, string> = {
  ideas: "unstarted",
  exploring: "started",
  discussing: "started",
  closed: "completed",
};

async function getLinearStateIdForColumn(linearIssueId: string, column: string): Promise<string | null> {
  const targetType = COLUMN_TO_STATE_TYPE[column];
  if (!targetType) return null;

  const teamId = await getIssueTeamId(linearIssueId);
  if (!teamId) return null;

  const states = await getWorkflowStates(teamId);
  const match = states.find(s => s.type === targetType);
  return match?.id || null;
}

// Helper to format research item for API response
function formatResearchItem(
  item: typeof schema.researchItems.$inferSelect,
  notes: Array<typeof schema.researchNotes.$inferSelect> = [],
  documents: Array<typeof schema.researchDocuments.$inferSelect> = [],
) {
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
    linear_issue_priority: item.linearIssuePriority,
    linear_issue_priority_label: item.linearIssuePriorityLabel,
    notes: notes.map(note => ({
      id: note.id,
      research_item_id: note.researchItemId,
      content: note.content,
      content_html: note.contentHtml,
      linear_comment_id: note.linearCommentId,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })),
    documents: documents.map(doc => ({
      id: doc.id,
      research_item_id: doc.researchItemId,
      url: doc.url,
      title: doc.title,
      created_at: doc.createdAt,
    })),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["api", "research"] or ["api", "research", ":id"] or ["api", "research", ":id", "notes"]

  const isSyncEndpoint = pathParts.length >= 3 && pathParts[2] === "sync-to-linear";
  const itemIdFromPath = pathParts.length >= 3 && !isSyncEndpoint ? parseInt(pathParts[2]) : null;
  const isNotesEndpoint = pathParts.length >= 4 && pathParts[3] === "notes";
  const isDocumentsEndpoint = pathParts.length >= 4 && pathParts[3] === "documents";
  const noteIdFromPath = pathParts.length >= 5 && isNotesEndpoint ? parseInt(pathParts[4]) : null;
  const documentIdFromPath = pathParts.length >= 5 && isDocumentsEndpoint ? parseInt(pathParts[4]) : null;

  // GET /api/research - List all research items with notes
  if (request.method === "GET" && !itemIdFromPath) {
    try {
      const items = await db
        .select()
        .from(schema.researchItems)
        .orderBy(asc(schema.researchItems.displayOrder));

      // Fetch all notes and documents
      const allNotes = await db
        .select()
        .from(schema.researchNotes)
        .orderBy(asc(schema.researchNotes.createdAt));

      const allDocuments = await db
        .select()
        .from(schema.researchDocuments)
        .orderBy(asc(schema.researchDocuments.createdAt));

      // Group notes by research item id
      const notesByItemId = new Map<number, Array<typeof schema.researchNotes.$inferSelect>>();
      for (const note of allNotes) {
        const existing = notesByItemId.get(note.researchItemId) || [];
        existing.push(note);
        notesByItemId.set(note.researchItemId, existing);
      }

      // Group documents by research item id
      const docsByItemId = new Map<number, Array<typeof schema.researchDocuments.$inferSelect>>();
      for (const doc of allDocuments) {
        const existing = docsByItemId.get(doc.researchItemId) || [];
        existing.push(doc);
        docsByItemId.set(doc.researchItemId, existing);
      }

      const result = items.map((item) => formatResearchItem(item, notesByItemId.get(item.id) || [], docsByItemId.get(item.id) || []));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching research items:", error);
      return Response.json({ error: "Failed to fetch research items" }, { status: 500 });
    }
  }

  // GET /api/research/:id - Get single research item with notes and documents
  if (request.method === "GET" && itemIdFromPath && !isNotesEndpoint && !isDocumentsEndpoint) {
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

      const documents = await db
        .select()
        .from(schema.researchDocuments)
        .where(eq(schema.researchDocuments.researchItemId, itemIdFromPath))
        .orderBy(asc(schema.researchDocuments.createdAt));

      return Response.json(formatResearchItem(items[0], notes, documents));
    } catch (error) {
      console.error("Error fetching research item:", error);
      return Response.json({ error: "Failed to fetch research item" }, { status: 500 });
    }
  }

  // POST /api/research - Add a new research item (from Linear issue)
  if (request.method === "POST" && !itemIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("POST /api/research: Unauthorized access attempt", {
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to add research items" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        linear_issue_id,
        linear_issue_identifier,
        linear_issue_title,
        linear_issue_url,
        linear_issue_description,
        linear_issue_priority,
        linear_issue_priority_label,
        title,
        description,
        column = "ideas",
      } = body as {
        linear_issue_id: string;
        linear_issue_identifier: string;
        linear_issue_title: string;
        linear_issue_url: string;
        linear_issue_description?: string;
        linear_issue_priority?: number;
        linear_issue_priority_label?: string;
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
          linearIssuePriority: linear_issue_priority ?? null,
          linearIssuePriorityLabel: linear_issue_priority_label ?? null,
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
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("POST /api/research/:id/notes: Unauthorized access attempt", {
        itemId: itemIdFromPath,
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to add notes" }, { status: 401 });
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

      // Sync note to Linear as a comment
      try {
        const item = items[0];
        const result = await addComment(item.linearIssueId, content.trim());
        if (result.success && result.commentId) {
          await db
            .update(schema.researchNotes)
            .set({ linearCommentId: result.commentId })
            .where(eq(schema.researchNotes.id, note.id));
        } else if (!result.success) {
          console.warn(`Failed to sync note to Linear comment for ${item.linearIssueIdentifier}:`, result.error);
        }
      } catch (err) {
        console.warn("Error syncing note to Linear comment:", err);
      }

      return Response.json({
        id: note.id,
        research_item_id: note.researchItemId,
        content: note.content,
        content_html: note.contentHtml,
        linear_comment_id: note.linearCommentId,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating note:", error);
      return Response.json({ error: "Failed to create note" }, { status: 500 });
    }
  }

  // PUT /api/research/:id/notes/:noteId - Update a note
  if (request.method === "PUT" && itemIdFromPath && isNotesEndpoint && noteIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required to edit notes" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { content } = body as { content: string };

      if (!content?.trim()) {
        return Response.json({ error: "Content is required" }, { status: 400 });
      }

      const updated = await db
        .update(schema.researchNotes)
        .set({
          content: content.trim(),
          contentHtml: parseMarkdown(content.trim()),
          updatedAt: new Date(),
        })
        .where(eq(schema.researchNotes.id, noteIdFromPath))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Note not found" }, { status: 404 });
      }

      const note = updated[0];

      // Sync edit to Linear comment if linked
      if (note.linearCommentId) {
        try {
          const result = await updateComment(note.linearCommentId, content.trim());
          if (!result.success) {
            console.warn(`Failed to sync note edit to Linear comment ${note.linearCommentId}:`, result.error);
          }
        } catch (err) {
          console.warn("Error syncing note edit to Linear comment:", err);
        }
      }

      return Response.json({
        id: note.id,
        research_item_id: note.researchItemId,
        content: note.content,
        content_html: note.contentHtml,
        linear_comment_id: note.linearCommentId,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      });
    } catch (error) {
      console.error("Error updating note:", error);
      return Response.json({ error: "Failed to update note" }, { status: 500 });
    }
  }

  // PUT /api/research/:id - Update a research item
  if (request.method === "PUT" && itemIdFromPath && !isNotesEndpoint && !isDocumentsEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("PUT /api/research/:id: Unauthorized access attempt", {
        itemId: itemIdFromPath,
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to update research items" }, { status: 401 });
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

      // Sync title change to Linear
      if (title !== undefined) {
        try {
          const result = await updateIssueTitle(updated[0].linearIssueId, title);
          if (!result.success) {
            console.warn(`Failed to sync title to Linear for ${updated[0].linearIssueIdentifier}:`, result.error);
          }
        } catch (err) {
          console.warn(`Error syncing title to Linear for ${updated[0].linearIssueIdentifier}:`, err);
        }
      }

      // Sync description change to Linear
      if (description !== undefined) {
        try {
          const result = await updateIssueDescription(updated[0].linearIssueId, description || "");
          if (!result.success) {
            console.warn(`Failed to sync description to Linear for ${updated[0].linearIssueIdentifier}:`, result.error);
          }
        } catch (err) {
          console.warn(`Error syncing description to Linear for ${updated[0].linearIssueIdentifier}:`, err);
        }
      }

      // Sync column change to Linear status
      if (column !== undefined) {
        try {
          const stateId = await getLinearStateIdForColumn(updated[0].linearIssueId, column);
          if (stateId) {
            const result = await updateIssueState(updated[0].linearIssueId, stateId);
            if (!result.success) {
              console.warn(`Failed to sync column to Linear for ${updated[0].linearIssueIdentifier}:`, result.error);
            }
          }
        } catch (err) {
          console.warn(`Error syncing column to Linear for ${updated[0].linearIssueIdentifier}:`, err);
        }
      }

      // Fetch notes and documents for the item
      const notes = await db
        .select()
        .from(schema.researchNotes)
        .where(eq(schema.researchNotes.researchItemId, itemIdFromPath))
        .orderBy(asc(schema.researchNotes.createdAt));

      const documents = await db
        .select()
        .from(schema.researchDocuments)
        .where(eq(schema.researchDocuments.researchItemId, itemIdFromPath))
        .orderBy(asc(schema.researchDocuments.createdAt));

      return Response.json(formatResearchItem(updated[0], notes, documents));
    } catch (error) {
      console.error("Error updating research item:", error);
      return Response.json({ error: "Failed to update research item" }, { status: 500 });
    }
  }

  // PATCH /api/research - Batch reorder items (kept for backward compatibility)
  if (request.method === "PATCH" && !itemIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("PATCH /api/research: Unauthorized access attempt", {
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to reorder items" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { items } = body as {
        items: Array<{ id: number; column: string; display_order: number }>;
      };

      if (!items || !Array.isArray(items)) {
        return Response.json({ error: "Items array required" }, { status: 400 });
      }

      // Fetch current columns for items being updated (to detect changes)
      const itemIds = items.map(i => i.id);
      const currentItems = itemIds.length > 0
        ? await db.select({ id: schema.researchItems.id, column: schema.researchItems.column, linearIssueId: schema.researchItems.linearIssueId, linearIssueIdentifier: schema.researchItems.linearIssueIdentifier })
            .from(schema.researchItems)
            .where(inArray(schema.researchItems.id, itemIds))
        : [];
      const currentColumnMap = new Map(currentItems.map(i => [i.id, i]));

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

      // Sync column changes to Linear
      for (const item of items) {
        const current = currentColumnMap.get(item.id);
        if (current && current.column !== item.column) {
          try {
            const stateId = await getLinearStateIdForColumn(current.linearIssueId, item.column);
            if (stateId) {
              const result = await updateIssueState(current.linearIssueId, stateId);
              if (!result.success) {
                console.warn(`Failed to sync column to Linear for ${current.linearIssueIdentifier}:`, result.error);
              }
            }
          } catch (err) {
            console.warn(`Error syncing column to Linear for ${current.linearIssueIdentifier}:`, err);
          }
        }
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error reordering research items:", error);
      return Response.json({ error: "Failed to reorder items" }, { status: 500 });
    }
  }

  // DELETE /api/research/:id - Remove item from board
  if (request.method === "DELETE" && itemIdFromPath && !isNotesEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("DELETE /api/research/:id: Unauthorized access attempt", {
        itemId: itemIdFromPath,
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to delete items" }, { status: 401 });
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
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      console.warn("DELETE /api/research/:id/notes/:noteId: Unauthorized access attempt", {
        itemId: itemIdFromPath,
        noteId: noteIdFromPath,
        userId: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
      });
      return Response.json({ error: "Admin access required to delete notes" }, { status: 401 });
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

  // POST /api/research/:id/documents - Add a document to a research item
  if (request.method === "POST" && itemIdFromPath && isDocumentsEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required to add documents" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { url, title } = body as { url: string; title: string };

      if (!url?.trim() || !title?.trim()) {
        return Response.json({ error: "URL and title are required" }, { status: 400 });
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
        .insert(schema.researchDocuments)
        .values({
          researchItemId: itemIdFromPath,
          url: url.trim(),
          title: title.trim(),
        })
        .returning();

      const doc = inserted[0];
      return Response.json({
        id: doc.id,
        research_item_id: doc.researchItemId,
        url: doc.url,
        title: doc.title,
        created_at: doc.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating document:", error);
      return Response.json({ error: "Failed to create document" }, { status: 500 });
    }
  }

  // DELETE /api/research/:id/documents/:documentId - Delete a document
  if (request.method === "DELETE" && itemIdFromPath && isDocumentsEndpoint && documentIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required to delete documents" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.researchDocuments)
        .where(eq(schema.researchDocuments.id, documentIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      return Response.json({ error: "Failed to delete document" }, { status: 500 });
    }
  }

  // POST /api/research/sync-to-linear - Bulk sync all research items to Linear
  if (request.method === "POST" && isSyncEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required for bulk sync" }, { status: 401 });
    }

    const dryRun = url.searchParams.get("dry_run") === "true";

    try {
      const items = await db
        .select()
        .from(schema.researchItems)
        .orderBy(asc(schema.researchItems.id));

      const allNotes = await db
        .select()
        .from(schema.researchNotes)
        .orderBy(asc(schema.researchNotes.createdAt));

      const notesByItemId = new Map<number, Array<typeof schema.researchNotes.$inferSelect>>();
      for (const note of allNotes) {
        const existing = notesByItemId.get(note.researchItemId) || [];
        existing.push(note);
        notesByItemId.set(note.researchItemId, existing);
      }

      // Fetch current Linear data to compare
      const linearIssueIds = items.map(i => i.linearIssueId);
      const linearIssues = await getIssuesByIds(linearIssueIds);
      const linearMap = new Map(linearIssues.map(i => [i.id, i]));

      const summary = { synced: 0, skipped: 0, errors: 0, details: [] as string[] };

      for (const item of items) {
        const linearIssue = linearMap.get(item.linearIssueId);
        const notes = notesByItemId.get(item.id) || [];

        // Sync title if different from Linear
        if (linearIssue && item.title !== linearIssue.title) {
          if (dryRun) {
            summary.details.push(`[DRY RUN] Would sync title for ${item.linearIssueIdentifier}: "${linearIssue.title}" → "${item.title}"`);
            summary.synced++;
          } else {
            await new Promise(r => setTimeout(r, 200));
            const result = await updateIssueTitle(item.linearIssueId, item.title);
            if (result.success) {
              summary.details.push(`Synced title for ${item.linearIssueIdentifier}`);
              summary.synced++;
            } else {
              summary.details.push(`Error syncing title for ${item.linearIssueIdentifier}: ${result.error}`);
              summary.errors++;
            }
          }
        } else {
          summary.details.push(`Skipped title for ${item.linearIssueIdentifier} (unchanged)`);
          summary.skipped++;
        }

        // Sync description if different from Linear
        const localDesc = item.description || "";
        const linearDesc = linearIssue?.description || "";
        if (linearIssue && localDesc !== linearDesc) {
          if (dryRun) {
            summary.details.push(`[DRY RUN] Would sync description for ${item.linearIssueIdentifier}`);
            summary.synced++;
          } else {
            await new Promise(r => setTimeout(r, 200));
            const result = await updateIssueDescription(item.linearIssueId, localDesc);
            if (result.success) {
              summary.details.push(`Synced description for ${item.linearIssueIdentifier}`);
              summary.synced++;
            } else {
              summary.details.push(`Error syncing description for ${item.linearIssueIdentifier}: ${result.error}`);
              summary.errors++;
            }
          }
        } else {
          summary.details.push(`Skipped description for ${item.linearIssueIdentifier} (unchanged)`);
          summary.skipped++;
        }

        // Sync unlinked notes as comments
        for (const note of notes) {
          if (!note.linearCommentId) {
            if (dryRun) {
              summary.details.push(`[DRY RUN] Would create comment for note ${note.id} on ${item.linearIssueIdentifier}`);
              summary.synced++;
            } else {
              await new Promise(r => setTimeout(r, 200));
              const result = await addComment(item.linearIssueId, note.content);
              if (result.success && result.commentId) {
                await db
                  .update(schema.researchNotes)
                  .set({ linearCommentId: result.commentId })
                  .where(eq(schema.researchNotes.id, note.id));
                summary.details.push(`Created comment for note ${note.id} on ${item.linearIssueIdentifier}`);
                summary.synced++;
              } else {
                summary.details.push(`Error creating comment for note ${note.id}: ${result.error}`);
                summary.errors++;
              }
            }
          } else {
            summary.details.push(`Skipped note ${note.id} (already linked to comment ${note.linearCommentId})`);
            summary.skipped++;
          }
        }
      }

      return Response.json(summary);
    } catch (error) {
      console.error("Error during bulk sync:", error);
      return Response.json({ error: "Bulk sync failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/research", "/api/research/*"],
};
