import { db, schema } from "./db";
import { eq } from "drizzle-orm";

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
  token: string | null,
  requiredType?: "admin" | "kudos"
): Promise<{ valid: boolean; type?: string }> {
  if (!token) {
    return { valid: false };
  }

  const result = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, token))
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

export async function deleteSession(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
}

export function verifyPassword(password: string, type: "admin" | "kudos"): boolean {
  const expectedPassword =
    type === "admin"
      ? Netlify.env.get("ADMIN_PASSWORD")
      : Netlify.env.get("KUDOS_PASSWORD");

  return password === expectedPassword;
}

// Extract token from Authorization header (Bearer token)
export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer " prefix
}

// Helper to check auth using Authorization header
export async function requireAuth(
  req: Request,
  requiredType?: "admin" | "kudos"
): Promise<{ authorized: boolean; type?: string }> {
  const token = getTokenFromRequest(req);
  const { valid, type } = await validateSession(token, requiredType);

  return { authorized: valid, type };
}
