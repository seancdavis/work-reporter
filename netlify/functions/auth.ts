import type { Config } from "@netlify/functions";
import { getAccessTypeFromEmail } from "./_shared/auth";

export default async (req: Request): Promise<Response> => {
  // GET - Check current auth status based on headers
  if (req.method === "GET") {
    const userId = req.headers.get("x-user-id");
    const email = req.headers.get("x-user-email");

    if (!userId || !email) {
      return Response.json({ authenticated: false, type: null });
    }

    const accessType = getAccessTypeFromEmail(email);
    return Response.json({
      authenticated: !!accessType,
      type: accessType,
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/auth",
};
