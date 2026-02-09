import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, asc, desc } from "drizzle-orm";
import { requireAdmin } from "./_shared/auth";
import { parseMarkdown } from "./_shared/markdown";

// Helper to format impact item for API response
function formatImpactItem(
  item: typeof schema.impactItems.$inferSelect,
  notes: Array<typeof schema.impactNotes.$inferSelect> = [],
  links: Array<typeof schema.impactLinks.$inferSelect> = [],
) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    description_html: item.descriptionHtml,
    shipped_date: item.shippedDate,
    linear_issue_id: item.linearIssueId,
    linear_issue_identifier: item.linearIssueIdentifier,
    linear_issue_title: item.linearIssueTitle,
    linear_issue_url: item.linearIssueUrl,
    notes: notes.map(note => ({
      id: note.id,
      impact_item_id: note.impactItemId,
      content: note.content,
      content_html: note.contentHtml,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })),
    links: links.map(link => ({
      id: link.id,
      impact_item_id: link.impactItemId,
      url: link.url,
      label: link.label,
      created_at: link.createdAt,
    })),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathParts: ["api", "impact"] or ["api", "impact", ":id"] or ["api", "impact", ":id", "notes"] etc.

  const itemIdFromPath = pathParts.length >= 3 ? parseInt(pathParts[2]) : null;
  const isNotesEndpoint = pathParts.length >= 4 && pathParts[3] === "notes";
  const isLinksEndpoint = pathParts.length >= 4 && pathParts[3] === "links";
  const noteIdFromPath = pathParts.length >= 5 && isNotesEndpoint ? parseInt(pathParts[4]) : null;
  const linkIdFromPath = pathParts.length >= 5 && isLinksEndpoint ? parseInt(pathParts[4]) : null;

  // GET /api/impact - List all impact items with notes and links
  if (request.method === "GET" && !itemIdFromPath) {
    try {
      const items = await db
        .select()
        .from(schema.impactItems)
        .orderBy(desc(schema.impactItems.shippedDate));

      const allNotes = await db
        .select()
        .from(schema.impactNotes)
        .orderBy(asc(schema.impactNotes.createdAt));

      const allLinks = await db
        .select()
        .from(schema.impactLinks)
        .orderBy(asc(schema.impactLinks.createdAt));

      const notesByItemId = new Map<number, Array<typeof schema.impactNotes.$inferSelect>>();
      for (const note of allNotes) {
        const existing = notesByItemId.get(note.impactItemId) || [];
        existing.push(note);
        notesByItemId.set(note.impactItemId, existing);
      }

      const linksByItemId = new Map<number, Array<typeof schema.impactLinks.$inferSelect>>();
      for (const link of allLinks) {
        const existing = linksByItemId.get(link.impactItemId) || [];
        existing.push(link);
        linksByItemId.set(link.impactItemId, existing);
      }

      const result = items.map((item) =>
        formatImpactItem(item, notesByItemId.get(item.id) || [], linksByItemId.get(item.id) || [])
      );

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching impact items:", error);
      return Response.json({ error: "Failed to fetch impact items" }, { status: 500 });
    }
  }

  // GET /api/impact/:id - Get single impact item
  if (request.method === "GET" && itemIdFromPath && !isNotesEndpoint && !isLinksEndpoint) {
    try {
      const items = await db
        .select()
        .from(schema.impactItems)
        .where(eq(schema.impactItems.id, itemIdFromPath))
        .limit(1);

      if (items.length === 0) {
        return Response.json({ error: "Impact item not found" }, { status: 404 });
      }

      const notes = await db
        .select()
        .from(schema.impactNotes)
        .where(eq(schema.impactNotes.impactItemId, itemIdFromPath))
        .orderBy(asc(schema.impactNotes.createdAt));

      const links = await db
        .select()
        .from(schema.impactLinks)
        .where(eq(schema.impactLinks.impactItemId, itemIdFromPath))
        .orderBy(asc(schema.impactLinks.createdAt));

      return Response.json(formatImpactItem(items[0], notes, links));
    } catch (error) {
      console.error("Error fetching impact item:", error);
      return Response.json({ error: "Failed to fetch impact item" }, { status: 500 });
    }
  }

  // POST /api/impact - Create a new impact item
  if (request.method === "POST" && !itemIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        title,
        description,
        shipped_date,
        linear_issue_id,
        linear_issue_identifier,
        linear_issue_title,
        linear_issue_url,
      } = body as {
        title: string;
        description?: string;
        shipped_date: string;
        linear_issue_id?: string;
        linear_issue_identifier?: string;
        linear_issue_title?: string;
        linear_issue_url?: string;
      };

      if (!title?.trim() || !shipped_date) {
        return Response.json({ error: "Title and shipped date are required" }, { status: 400 });
      }

      const inserted = await db
        .insert(schema.impactItems)
        .values({
          title: title.trim(),
          description: description || null,
          descriptionHtml: parseMarkdown(description),
          shippedDate: shipped_date,
          linearIssueId: linear_issue_id || null,
          linearIssueIdentifier: linear_issue_identifier || null,
          linearIssueTitle: linear_issue_title || null,
          linearIssueUrl: linear_issue_url || null,
        })
        .returning();

      return Response.json(formatImpactItem(inserted[0]), { status: 201 });
    } catch (error) {
      console.error("Error creating impact item:", error);
      return Response.json({ error: "Failed to create impact item" }, { status: 500 });
    }
  }

  // PUT /api/impact/:id - Update an impact item
  if (request.method === "PUT" && itemIdFromPath && !isNotesEndpoint && !isLinksEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const {
        title,
        description,
        shipped_date,
        linear_issue_id,
        linear_issue_identifier,
        linear_issue_title,
        linear_issue_url,
      } = body as {
        title?: string;
        description?: string;
        shipped_date?: string;
        linear_issue_id?: string | null;
        linear_issue_identifier?: string | null;
        linear_issue_title?: string | null;
        linear_issue_url?: string | null;
      };

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) {
        updateData.description = description || null;
        updateData.descriptionHtml = parseMarkdown(description);
      }
      if (shipped_date !== undefined) updateData.shippedDate = shipped_date;
      if (linear_issue_id !== undefined) updateData.linearIssueId = linear_issue_id || null;
      if (linear_issue_identifier !== undefined) updateData.linearIssueIdentifier = linear_issue_identifier || null;
      if (linear_issue_title !== undefined) updateData.linearIssueTitle = linear_issue_title || null;
      if (linear_issue_url !== undefined) updateData.linearIssueUrl = linear_issue_url || null;

      const updated = await db
        .update(schema.impactItems)
        .set(updateData)
        .where(eq(schema.impactItems.id, itemIdFromPath))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Impact item not found" }, { status: 404 });
      }

      const notes = await db
        .select()
        .from(schema.impactNotes)
        .where(eq(schema.impactNotes.impactItemId, itemIdFromPath))
        .orderBy(asc(schema.impactNotes.createdAt));

      const links = await db
        .select()
        .from(schema.impactLinks)
        .where(eq(schema.impactLinks.impactItemId, itemIdFromPath))
        .orderBy(asc(schema.impactLinks.createdAt));

      return Response.json(formatImpactItem(updated[0], notes, links));
    } catch (error) {
      console.error("Error updating impact item:", error);
      return Response.json({ error: "Failed to update impact item" }, { status: 500 });
    }
  }

  // DELETE /api/impact/:id - Delete an impact item
  if (request.method === "DELETE" && itemIdFromPath && !isNotesEndpoint && !isLinksEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.impactItems)
        .where(eq(schema.impactItems.id, itemIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting impact item:", error);
      return Response.json({ error: "Failed to delete impact item" }, { status: 500 });
    }
  }

  // POST /api/impact/:id/notes - Add a note
  if (request.method === "POST" && itemIdFromPath && isNotesEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { content } = body as { content: string };

      if (!content?.trim()) {
        return Response.json({ error: "Content is required" }, { status: 400 });
      }

      // Verify item exists
      const items = await db
        .select()
        .from(schema.impactItems)
        .where(eq(schema.impactItems.id, itemIdFromPath))
        .limit(1);

      if (items.length === 0) {
        return Response.json({ error: "Impact item not found" }, { status: 404 });
      }

      const inserted = await db
        .insert(schema.impactNotes)
        .values({
          impactItemId: itemIdFromPath,
          content: content.trim(),
          contentHtml: parseMarkdown(content.trim()),
        })
        .returning();

      const note = inserted[0];
      return Response.json({
        id: note.id,
        impact_item_id: note.impactItemId,
        content: note.content,
        content_html: note.contentHtml,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating note:", error);
      return Response.json({ error: "Failed to create note" }, { status: 500 });
    }
  }

  // PUT /api/impact/:id/notes/:noteId - Update a note
  if (request.method === "PUT" && itemIdFromPath && isNotesEndpoint && noteIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { content } = body as { content: string };

      if (!content?.trim()) {
        return Response.json({ error: "Content is required" }, { status: 400 });
      }

      const updated = await db
        .update(schema.impactNotes)
        .set({
          content: content.trim(),
          contentHtml: parseMarkdown(content.trim()),
          updatedAt: new Date(),
        })
        .where(eq(schema.impactNotes.id, noteIdFromPath))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Note not found" }, { status: 404 });
      }

      const note = updated[0];
      return Response.json({
        id: note.id,
        impact_item_id: note.impactItemId,
        content: note.content,
        content_html: note.contentHtml,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      });
    } catch (error) {
      console.error("Error updating note:", error);
      return Response.json({ error: "Failed to update note" }, { status: 500 });
    }
  }

  // DELETE /api/impact/:id/notes/:noteId - Delete a note
  if (request.method === "DELETE" && itemIdFromPath && isNotesEndpoint && noteIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.impactNotes)
        .where(eq(schema.impactNotes.id, noteIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      return Response.json({ error: "Failed to delete note" }, { status: 500 });
    }
  }

  // POST /api/impact/:id/links - Add a link
  if (request.method === "POST" && itemIdFromPath && isLinksEndpoint) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { url: linkUrl, label } = body as { url: string; label: string };

      if (!linkUrl?.trim() || !label?.trim()) {
        return Response.json({ error: "URL and label are required" }, { status: 400 });
      }

      // Verify item exists
      const items = await db
        .select()
        .from(schema.impactItems)
        .where(eq(schema.impactItems.id, itemIdFromPath))
        .limit(1);

      if (items.length === 0) {
        return Response.json({ error: "Impact item not found" }, { status: 404 });
      }

      const inserted = await db
        .insert(schema.impactLinks)
        .values({
          impactItemId: itemIdFromPath,
          url: linkUrl.trim(),
          label: label.trim(),
        })
        .returning();

      const link = inserted[0];
      return Response.json({
        id: link.id,
        impact_item_id: link.impactItemId,
        url: link.url,
        label: link.label,
        created_at: link.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating link:", error);
      return Response.json({ error: "Failed to create link" }, { status: 500 });
    }
  }

  // DELETE /api/impact/:id/links/:linkId - Delete a link
  if (request.method === "DELETE" && itemIdFromPath && isLinksEndpoint && linkIdFromPath) {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Admin access required" }, { status: 401 });
    }

    try {
      await db
        .delete(schema.impactLinks)
        .where(eq(schema.impactLinks.id, linkIdFromPath));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting link:", error);
      return Response.json({ error: "Failed to delete link" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/impact", "/api/impact/*"],
};
