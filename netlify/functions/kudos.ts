import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireAdmin } from "./_shared/auth";
import { uploadScreenshot, deleteScreenshot } from "./_shared/blobs";
import { parseMarkdown } from "./_shared/markdown";

function toApiResponse(k: typeof schema.kudos.$inferSelect) {
  return {
    id: k.id,
    received_date: k.receivedDate,
    sender_name: k.senderName,
    message: k.message,
    message_html: k.messageHtml,
    context: k.context,
    context_html: k.contextHtml,
    screenshot_blob_key: k.screenshotBlobKey,
    show_screenshot: k.showScreenshot,
    tags: k.tags,
    created_at: k.createdAt,
    updated_at: k.updatedAt,
  };
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // GET /api/kudos - List kudos (read-only, no auth required)
  if (request.method === "GET") {
    try {
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam) : 50;

      const kudosList = await db
        .select()
        .from(schema.kudos)
        .orderBy(desc(schema.kudos.receivedDate), asc(schema.kudos.createdAt))
        .limit(limit);

      const result = kudosList.map(toApiResponse);

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching kudos:", error);
      return Response.json({ error: "Failed to fetch kudos" }, { status: 500 });
    }
  }

  // POST /api/kudos - Create new kudos (requires admin auth)
  if (request.method === "POST") {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const contentType = request.headers.get("content-type") || "";

      let kudoData: {
        received_date: string;
        sender_name: string;
        message: string;
        context?: string;
        tags?: string[];
        show_screenshot?: number;
      };
      let screenshotKey: string | null = null;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();

        kudoData = {
          received_date: formData.get("received_date") as string,
          sender_name: formData.get("sender_name") as string,
          message: formData.get("message") as string,
          context: (formData.get("context") as string) || undefined,
          tags: formData.get("tags")
            ? JSON.parse(formData.get("tags") as string)
            : [],
          show_screenshot: formData.get("show_screenshot") === "1" ? 1 : 0,
        };

        const screenshot = formData.get("screenshot") as File | null;
        if (screenshot) {
          const buffer = await screenshot.arrayBuffer();
          screenshotKey = await uploadScreenshot(
            buffer,
            screenshot.name,
            screenshot.type
          );
        }
      } else {
        kudoData = await request.json();
      }

      const { received_date, sender_name, message, context, tags = [], show_screenshot = 0 } = kudoData;

      if (!received_date || !sender_name || !message) {
        return Response.json(
          { error: "received_date, sender_name, and message are required" },
          { status: 400 }
        );
      }

      const inserted = await db
        .insert(schema.kudos)
        .values({
          receivedDate: received_date,
          senderName: sender_name,
          message,
          messageHtml: parseMarkdown(message),
          context: context || null,
          contextHtml: parseMarkdown(context || null),
          screenshotBlobKey: screenshotKey,
          showScreenshot: show_screenshot,
          tags: tags,
        })
        .returning();

      return Response.json(toApiResponse(inserted[0]), { status: 201 });
    } catch (error) {
      console.error("Error creating kudos:", error);
      return Response.json({ error: "Failed to create kudos" }, { status: 500 });
    }
  }

  // PUT /api/kudos?id=123 - Update kudos (requires admin auth)
  if (request.method === "PUT") {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const idParam = url.searchParams.get("id");
      if (!idParam) {
        return Response.json({ error: "ID parameter required" }, { status: 400 });
      }

      const contentType = request.headers.get("content-type") || "";

      let body: {
        received_date?: string;
        sender_name?: string;
        message?: string;
        context?: string;
        tags?: string[];
        show_screenshot?: number;
      };
      let newScreenshotKey: string | null | undefined = undefined;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();

        body = {};
        const rd = formData.get("received_date") as string;
        if (rd) body.received_date = rd;
        const sn = formData.get("sender_name") as string;
        if (sn) body.sender_name = sn;
        const msg = formData.get("message") as string;
        if (msg) body.message = msg;
        const ctx = formData.get("context") as string;
        if (ctx !== null) body.context = ctx || undefined;
        const tagsStr = formData.get("tags") as string;
        if (tagsStr) body.tags = JSON.parse(tagsStr);
        const showSS = formData.get("show_screenshot");
        if (showSS !== null) body.show_screenshot = showSS === "1" ? 1 : 0;

        const screenshot = formData.get("screenshot") as File | null;
        if (screenshot) {
          // Delete old screenshot first
          const existing = await db
            .select()
            .from(schema.kudos)
            .where(eq(schema.kudos.id, parseInt(idParam)))
            .limit(1);
          if (existing.length > 0 && existing[0].screenshotBlobKey) {
            await deleteScreenshot(existing[0].screenshotBlobKey);
          }
          const buffer = await screenshot.arrayBuffer();
          newScreenshotKey = await uploadScreenshot(buffer, screenshot.name, screenshot.type);
        }
      } else {
        body = await request.json();
      }

      const { received_date, sender_name, message, context, tags, show_screenshot } = body;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (received_date) updateData.receivedDate = received_date;
      if (sender_name) updateData.senderName = sender_name;
      if (message !== undefined) {
        updateData.message = message;
        updateData.messageHtml = parseMarkdown(message);
      }
      if (context !== undefined) {
        updateData.context = context || null;
        updateData.contextHtml = parseMarkdown(context || null);
      }
      if (tags) updateData.tags = tags;
      if (show_screenshot !== undefined) updateData.showScreenshot = show_screenshot;
      if (newScreenshotKey !== undefined) updateData.screenshotBlobKey = newScreenshotKey;

      const updated = await db
        .update(schema.kudos)
        .set(updateData)
        .where(eq(schema.kudos.id, parseInt(idParam)))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Kudos not found" }, { status: 404 });
      }

      return Response.json(toApiResponse(updated[0]));
    } catch (error) {
      console.error("Error updating kudos:", error);
      return Response.json({ error: "Failed to update kudos" }, { status: 500 });
    }
  }

  // DELETE /api/kudos?id=123 (requires admin auth)
  if (request.method === "DELETE") {
    const auth = await requireAdmin(request);
    if (!auth.authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const idParam = url.searchParams.get("id");
      if (!idParam) {
        return Response.json({ error: "ID parameter required" }, { status: 400 });
      }

      // Get the kudos to check for screenshot
      const existing = await db
        .select()
        .from(schema.kudos)
        .where(eq(schema.kudos.id, parseInt(idParam)))
        .limit(1);

      if (existing.length > 0 && existing[0].screenshotBlobKey) {
        await deleteScreenshot(existing[0].screenshotBlobKey);
      }

      await db
        .delete(schema.kudos)
        .where(eq(schema.kudos.id, parseInt(idParam)));

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error deleting kudos:", error);
      return Response.json({ error: "Failed to delete kudos" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/kudos",
};
