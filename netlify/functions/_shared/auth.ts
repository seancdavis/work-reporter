import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import type { Context } from "@netlify/functions";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(type: "admin" | "kudos"): Promise<string> {
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

export function verifyPassword(password: string, type: "admin" | "kudos"): boolean {
  const expectedPassword =
    type === "admin"
      ? Netlify.env.get("ADMIN_PASSWORD")
      : Netlify.env.get("KUDOS_PASSWORD");

  return password === expectedPassword;
}

// Helper to parse session from Cookie header
export function parseSessionFromCookies(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
  return cookies["session"];
}

// Helper to check auth using context.cookies or Cookie header fallback
export async function requireAuth(
  context: Context,
  requiredType?: "admin" | "kudos",
  req?: Request
): Promise<{ authorized: boolean; type?: string }> {
  // Try context.cookies first, then fall back to parsing Cookie header
  let sessionId = context.cookies.get("session");

  if (!sessionId && req) {
    sessionId = parseSessionFromCookies(req.headers.get("Cookie"));
  }

  const { valid, type } = await validateSession(sessionId || null, requiredType);

  return { authorized: valid, type };
}
