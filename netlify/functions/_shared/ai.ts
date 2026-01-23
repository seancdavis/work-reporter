// Netlify is a global object available in Netlify Functions
declare const Netlify: {
  env: {
    get(key: string): string | undefined;
  };
};

const AI_MODEL = "claude-haiku-4-5-20251001";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  // Use Netlify AI Gateway via ANTHROPIC_BASE_URL
  const baseUrl = Netlify.env.get("ANTHROPIC_BASE_URL");
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return "";
  }

  if (!baseUrl) {
    console.error("ANTHROPIC_BASE_URL not configured");
    return "";
  }

  // Construct the messages endpoint URL
  const messagesUrl = `${baseUrl}/messages`;

  try {
    const response = await fetch(messagesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status, await response.text());
      return "";
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
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
  weeklyPrediction?: {
    planned_accomplishments: string;
    goals: string[];
  }
): Promise<{
  summary: string;
  highlights: string[];
  metrics: { issuesWorkedOn: number; daysReported: number };
}> {
  const systemPrompt = `You are a helpful assistant that creates concise weekly work summaries for engineering standups.
Focus on accomplishments, impact, and key themes. Be professional but not overly formal.
Format the summary in a way that's useful for stakeholders and promotion evidence.`;

  const userMessage = `Please summarize this week's work based on the following daily standups:

${dailyStandups
  .map(
    (d) => `
**${d.date}**
- Yesterday: ${d.yesterday_summary || "N/A"}
- Today: ${d.today_plan || "N/A"}
- Blockers: ${d.blockers || "None"}
- Issues: ${d.linked_issues.map((i) => i.identifier).join(", ") || "None"}
`
  )
  .join("\n")}

${
  weeklyPrediction
    ? `
**Week's Planned Goals:**
${weeklyPrediction.planned_accomplishments}
Goals: ${weeklyPrediction.goals.join(", ")}
`
    : ""
}

Please provide:
1. A 2-3 paragraph summary of the week's accomplishments
2. 3-5 key highlights (as bullet points)
3. Any patterns or themes you notice

Format your response as JSON with this structure:
{
  "summary": "...",
  "highlights": ["...", "..."]
}`;

  const response = await generateAIResponse(systemPrompt, userMessage);

  try {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const uniqueIssues = new Set(
        dailyStandups.flatMap((d) => d.linked_issues.map((i) => i.identifier))
      );

      return {
        summary: parsed.summary || "",
        highlights: parsed.highlights || [],
        metrics: {
          issuesWorkedOn: uniqueIssues.size,
          daysReported: dailyStandups.length,
        },
      };
    }
  } catch (error) {
    console.error("Error parsing AI response:", error);
  }

  return {
    summary: response,
    highlights: [],
    metrics: {
      issuesWorkedOn: 0,
      daysReported: dailyStandups.length,
    },
  };
}

export async function extractIssueReferences(
  text: string
): Promise<string[]> {
  // Simple regex to find Linear-style issue identifiers (e.g., ENG-123, PROD-456)
  const issuePattern = /\b([A-Z]{2,10}-\d+)\b/g;
  const matches = text.match(issuePattern) || [];
  return [...new Set(matches)];
}
