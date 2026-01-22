import type { Config } from "@netlify/functions";
import {
  createSession,
  deleteSession,
  verifyPassword,
  validateSession,
  getTokenFromRequest,
} from "./_shared/auth";

export default async (req: Request): Promise<Response> => {
  // GET - Check current auth status
  if (req.method === "GET") {
    const token = getTokenFromRequest(req);

    const { valid, type } = await validateSession(token);
    console.log("[AUTH GET] Validation result:", { valid, type });

    return Response.json({ authenticated: valid, type: type || null });
  }

  // POST - Login
  if (req.method === "POST") {
    try {
      const { password, type = "admin" } = await req.json() as {
        password: string;
        type?: "admin" | "kudos";
      };

      if (!password) {
        return Response.json({ error: "Password required" }, { status: 400 });
      }

      if (!verifyPassword(password, type)) {
        return Response.json({ error: "Invalid password" }, { status: 401 });
      }

      const token = await createSession(type);
      console.log("[AUTH POST] Session created:", token.substring(0, 8) + "...");

      // Return token in response body (stored in localStorage by frontend)
      return Response.json({ success: true, type, token });
    } catch (error) {
      console.error("[AUTH POST] Login error:", error);
      return Response.json({ error: "Login failed" }, { status: 500 });
    }
  }

  // DELETE - Logout
  if (req.method === "DELETE") {
    const token = getTokenFromRequest(req);
    if (token) {
      await deleteSession(token);
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/auth",
};
