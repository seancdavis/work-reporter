import type { Config } from "@netlify/functions";
import { getPermissionsFromEmail } from "./_shared/auth";

export default async (req: Request): Promise<Response> => {
  // GET - Check current auth status and permissions
  if (req.method === "GET") {
    const userId = req.headers.get("x-user-id");
    const email = req.headers.get("x-user-email");

    if (!userId || !email) {
      return Response.json({
        authenticated: false,
        permissions: { read: false, viewKudos: false, admin: false },
      });
    }

    const permissions = getPermissionsFromEmail(email);
    const hasAnyPermission = permissions.read || permissions.viewKudos || permissions.admin;

    return Response.json({
      authenticated: hasAnyPermission,
      permissions,
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/auth",
};
