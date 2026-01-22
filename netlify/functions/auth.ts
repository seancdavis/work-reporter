import type { Context } from "@netlify/functions";
import {
  createSession,
  deleteSession,
  verifyPassword,
  getSessionFromRequest,
  createSessionCookie,
  clearSessionCookie,
  validateSession,
} from "./_shared/auth";
import { jsonResponse, errorResponse, handleCors, corsHeaders } from "./_shared/utils";

export default async (request: Request, context: Context) => {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);

  // GET /api/auth - Check current auth status
  if (request.method === "GET") {
    const sessionId = getSessionFromRequest(request);
    const { valid, type } = await validateSession(sessionId);

    return jsonResponse(
      { authenticated: valid, type: type || null },
      200,
      corsHeaders()
    );
  }

  // POST /api/auth - Login
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { password, type = "admin" } = body as {
        password: string;
        type?: "admin" | "kudos";
      };

      if (!password) {
        return errorResponse("Password required", 400);
      }

      if (!verifyPassword(password, type)) {
        return errorResponse("Invalid password", 401);
      }

      const sessionId = await createSession(type);

      return jsonResponse(
        { success: true, type },
        200,
        {
          ...corsHeaders(),
          "Set-Cookie": createSessionCookie(sessionId),
        }
      );
    } catch (error) {
      console.error("Login error:", error);
      return errorResponse("Login failed", 500);
    }
  }

  // DELETE /api/auth - Logout
  if (request.method === "DELETE") {
    const sessionId = getSessionFromRequest(request);
    if (sessionId) {
      await deleteSession(sessionId);
    }

    return jsonResponse(
      { success: true },
      200,
      {
        ...corsHeaders(),
        "Set-Cookie": clearSessionCookie(),
      }
    );
  }

  return errorResponse("Method not allowed", 405);
};
