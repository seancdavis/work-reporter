import type { Context } from "@netlify/functions";
import { getActiveIssues, searchIssues } from "./_shared/linear";
import { jsonResponse, errorResponse, handleCors, corsHeaders } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const url = new URL(request.url);
  const searchParam = url.searchParams.get("search");

  try {
    if (searchParam) {
      const issues = await searchIssues(searchParam);
      return jsonResponse(issues, 200, corsHeaders());
    } else {
      const issues = await getActiveIssues();
      return jsonResponse(issues, 200, corsHeaders());
    }
  } catch (error) {
    console.error("Error fetching Linear issues:", error);
    return errorResponse("Failed to fetch issues", 500);
  }
};
