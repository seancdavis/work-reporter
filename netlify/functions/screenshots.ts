import type { Context } from "@netlify/functions";
import { getScreenshot } from "./_shared/blobs";
import { errorResponse, handleCors } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return errorResponse("Key parameter required", 400);
  }

  try {
    const screenshot = await getScreenshot(key);

    if (!screenshot) {
      return errorResponse("Screenshot not found", 404);
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
    return errorResponse("Failed to fetch screenshot", 500);
  }
};
