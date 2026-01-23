import type { Context, Config } from "@netlify/functions";
import { db, schema } from "./_shared/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./_shared/auth";
import { uploadScreenshot, deleteScreenshot } from "./_shared/blobs";

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
        .orderBy(desc(schema.kudos.receivedDate))
        .limit(limit);

      // Convert to snake_case for API compatibility
      const result = kudosList.map((k) => ({
        id: k.id,
        received_date: k.receivedDate,
        sender_name: k.senderName,
        message: k.message,
        context: k.context,
        screenshot_blob_key: k.screenshotBlobKey,
        tags: k.tags,
        created_at: k.createdAt,
        updated_at: k.updatedAt,
      }));

      return Response.json(result);
    } catch (error) {
      console.error("Error fetching kudos:", error);
      return Response.json({ error: "Failed to fetch kudos" }, { status: 500 });
    }
  }

  // POST /api/kudos - Create a new kudo (requires admin auth)
  if (request.method === "POST") {
    const auth = await requireAuth(request, "admin");
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

      const { received_date, sender_name, message, context, tags = [] } = kudoData;

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
          context: context || null,
          screenshotBlobKey: screenshotKey,
          tags: tags,
        })
        .returning();

      const result = inserted[0];

      return Response.json({
        id: result.id,
        received_date: result.receivedDate,
        sender_name: result.senderName,
        message: result.message,
        context: result.context,
        screenshot_blob_key: result.screenshotBlobKey,
        tags: result.tags,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating kudo:", error);
      return Response.json({ error: "Failed to create kudo" }, { status: 500 });
    }
  }

  // PUT /api/kudos/:id - Update a kudo (requires admin auth)
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
      const { received_date, sender_name, message, context, tags } = body as {
        received_date?: string;
        sender_name?: string;
        message?: string;
        context?: string;
        tags?: string[];
      };

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (received_date) updateData.receivedDate = received_date;
      if (sender_name) updateData.senderName = sender_name;
      if (message) updateData.message = message;
      if (context !== undefined) updateData.context = context || null;
      if (tags) updateData.tags = tags;

      const updated = await db
        .update(schema.kudos)
        .set(updateData)
        .where(eq(schema.kudos.id, parseInt(idParam)))
        .returning();

      if (updated.length === 0) {
        return Response.json({ error: "Kudo not found" }, { status: 404 });
      }

      const result = updated[0];

      return Response.json({
        id: result.id,
        received_date: result.receivedDate,
        sender_name: result.senderName,
        message: result.message,
        context: result.context,
        screenshot_blob_key: result.screenshotBlobKey,
        tags: result.tags,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    } catch (error) {
      console.error("Error updating kudo:", error);
      return Response.json({ error: "Failed to update kudo" }, { status: 500 });
    }
  }

  // DELETE /api/kudos?id=123 (requires admin auth)
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

      // Get the kudo to check for screenshot
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
      console.error("Error deleting kudo:", error);
      return Response.json({ error: "Failed to delete kudo" }, { status: 500 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/kudos",
};
