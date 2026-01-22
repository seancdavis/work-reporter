import type { Context, Config } from "@netlify/functions";
import {
  createSession,
  deleteSession,
  verifyPassword,
  validateSession,
} from "./_shared/auth";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export default async (req: Request, context: Context): Promise<Response> => {
  // GET - Check current auth status
  if (req.method === "GET") {
    const sessionId = context.cookies.get("session");
    console.log("[AUTH GET] Session cookie:", sessionId ? sessionId.substring(0, 8) + "..." : "none");

    const { valid, type } = await validateSession(sessionId || null);
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

      const sessionId = await createSession(type);
      console.log("[AUTH POST] Session created:", sessionId.substring(0, 8) + "...");

      // Set cookie directly via Response header (bypassing context.cookies)
      const cookieHeader = `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
      console.log("[AUTH POST] Setting Set-Cookie header directly");

      return new Response(JSON.stringify({ success: true, type }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      });
    } catch (error) {
      console.error("[AUTH POST] Login error:", error);
      return Response.json({ error: "Login failed" }, { status: 500 });
    }
  }

  // DELETE - Logout
  if (req.method === "DELETE") {
    const sessionId = context.cookies.get("session");
    if (sessionId) {
      await deleteSession(sessionId);
    }

    // Clear cookie via Response header
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/auth",
};
