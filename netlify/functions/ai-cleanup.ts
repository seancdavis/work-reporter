import type { Context, Config } from "@netlify/functions";
import { requireAuth } from "./_shared/auth";
import { generateAIResponse } from "./_shared/ai";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await requireAuth(req, "admin");
  if (!auth.authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { field, content } = body as { field: string; content: string };

    if (!content || !content.trim()) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    const systemPrompt = `You are a helpful assistant that cleans up and improves standup notes.
Your job is to:
- Fix spelling and grammar errors
- Improve clarity and readability
- Keep the content concise but complete
- Preserve all technical details and issue references (like ENG-123)
- Format as a clear list if multiple items
- Use markdown formatting where appropriate (e.g., bullet points, bold, code blocks)
- Do NOT use headings (no # or ## etc) - the content will be displayed in a labeled section
- Do NOT add any preamble or explanation - just return the cleaned up text
- Keep the same general tone and voice`;

    const fieldLabel = field === "yesterday_summary"
      ? "yesterday's accomplishments"
      : field === "today_plan"
        ? "today's plan"
        : "blockers";

    const userMessage = `Please clean up these standup notes about ${fieldLabel}:

${content}`;

    const cleaned = await generateAIResponse(systemPrompt, userMessage);

    if (!cleaned) {
      return Response.json({ error: "AI processing failed" }, { status: 500 });
    }

    return Response.json({ cleaned: cleaned.trim() });
  } catch (error) {
    console.error("Error in AI cleanup:", error);
    return Response.json({ error: "Failed to process content" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/ai-cleanup",
};
