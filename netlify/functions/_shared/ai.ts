import Anthropic from "@anthropic-ai/sdk";

const AI_MODEL = "claude-haiku-4-5-20251001";

export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not configured");
    return "";
  }

  const anthropic = new Anthropic();

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = message.content[0];
    return content.type === "text" ? content.text : "";
  } catch (error) {
    console.error("Error calling AI API:", error);
    return "";
  }
}

export async function generateWeeklySummary(
  dailyStandups: Array<{
    date: string;
    yesterday_summary: string;
    today_plan: string;
    blockers: string;
    linked_issues: Array<{ identifier: string; title: string }>;
  }>,
  weeklyPlanning?: {
    planned_accomplishments: string;
  },
): Promise<string> {
  const systemPrompt = `You are a helpful assistant that creates concise weekly work summaries for engineering standups.

Important context about the daily standup structure:
- "yesterday_summary" is what was actually accomplished the previous day
- "today_plan" is what was planned for that day (may or may not have been completed)

Focus on what was actually accomplished (from yesterday_summary fields), not just what was planned.
Be professional but not overly formal. Use markdown formatting with bullet points for clarity.
The summary should be useful for stakeholders and promotion evidence.`;

  const userMessage = `Please summarize this week's work based on the following daily standups:

${dailyStandups
  .map(
    (d) => `
**${d.date}**
- What was accomplished: ${d.yesterday_summary || "N/A"}
- What was planned: ${d.today_plan || "N/A"}
- Blockers: ${d.blockers || "None"}
- Issues worked on: ${d.linked_issues.map((i) => `${i.identifier}: ${i.title}`).join(", ") || "None"}
`,
  )
  .join("\n")}

${
  weeklyPlanning
    ? `
**What was planned for this week:**
${weeklyPlanning.planned_accomplishments}
`
    : ""
}

Please provide a concise summary (2-3 short paragraphs or bullet points) of what was accomplished this week. Focus on actual accomplishments from the "What was accomplished" fields, and note if any planned items weren't addressed.`;

  const response = await generateAIResponse(systemPrompt, userMessage);
  return response;
}

export async function extractIssueReferences(text: string): Promise<string[]> {
  const issuePattern = /\b([A-Z]{2,10}-\d+)\b/g;
  const matches = text.match(issuePattern) || [];
  return [...new Set(matches)];
}
