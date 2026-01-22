import type { Context, Config } from "@netlify/functions";
import { getScreenshot } from "./_shared/blobs";

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return Response.json({ error: "Key parameter required" }, { status: 400 });
  }

  try {
    const screenshot = await getScreenshot(key);

    if (!screenshot) {
      return Response.json({ error: "Screenshot not found" }, { status: 404 });
    }

    return new Response(screenshot.data, {
      status: 200,
      headers: {
        "Content-Type": screenshot.contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error fetching screenshot:", error);
    return Response.json({ error: "Failed to fetch screenshot" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/screenshots",
};
