import { db, schema } from "./db";
import { eq, gt } from "drizzle-orm";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  type: "admin" | "kudos"
): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.sessions).values({
    id: sessionId,
    type,
    expiresAt,
  });

  return sessionId;
}

export async function validateSession(
  sessionId: string | null,
  requiredType?: "admin" | "kudos"
): Promise<{ valid: boolean; type?: string }> {
  if (!sessionId) {
    return { valid: false };
  }

  const result = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    return { valid: false };
  }

  const session = result[0];

  // Check if expired
  if (new Date(session.expiresAt) <= new Date()) {
    return { valid: false };
  }

  // Admin can access everything, kudos can only access kudos
  if (requiredType === "kudos" && session.type !== "admin" && session.type !== "kudos") {
    return { valid: false };
  }

  if (requiredType === "admin" && session.type !== "admin") {
    return { valid: false };
  }

  return { valid: true, type: session.type };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  return cookies["session"] || null;
}

export function createSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  return `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `session=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function verifyPassword(
  password: string,
  type: "admin" | "kudos"
): boolean {
  const expectedPassword =
    type === "admin"
      ? process.env.ADMIN_PASSWORD
      : process.env.KUDOS_PASSWORD;

  return password === expectedPassword;
}

// Helper to check auth and return appropriate response
export async function requireAuth(
  request: Request,
  requiredType?: "admin" | "kudos"
): Promise<{ authorized: boolean; response?: Response; sessionType?: string }> {
  const sessionId = getSessionFromRequest(request);
  const { valid, type } = await validateSession(sessionId, requiredType);

  if (!valid) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { authorized: true, sessionType: type };
}
