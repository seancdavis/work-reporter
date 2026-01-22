import type { Context, Config } from "@netlify/functions";
import { getActiveIssues, searchIssues } from "./_shared/linear";

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const searchParam = url.searchParams.get("search");

  try {
    if (searchParam) {
      const issues = await searchIssues(searchParam);
      return Response.json(issues);
    } else {
      const issues = await getActiveIssues();
      return Response.json(issues);
    }
  } catch (error) {
    console.error("Error fetching Linear issues:", error);
    return Response.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/linear",
};
