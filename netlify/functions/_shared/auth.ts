/**
 * Authentication utilities for Neon Auth (header-based + email allowlist)
 */

/**
 * Determines access type based on email allowlists
 */
export function getAccessTypeFromEmail(email: string): "admin" | "kudos" | null {
  const adminEmails = (Netlify.env.get("ADMIN_EMAILS") || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const kudosEmails = (Netlify.env.get("KUDOS_EMAILS") || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const normalizedEmail = email.toLowerCase();
  if (adminEmails.includes(normalizedEmail)) return "admin";
  if (kudosEmails.includes(normalizedEmail)) return "kudos";
  return null;
}

/**
 * Validates request authentication using headers and email allowlist
 */
export async function requireAuth(
  req: Request,
  requiredType?: "admin" | "kudos"
): Promise<{ authorized: boolean; type?: string; userId?: string; email?: string }> {
  const userId = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");

  if (!userId || !email) {
    return { authorized: false };
  }

  const accessType = getAccessTypeFromEmail(email);
  if (!accessType) {
    return { authorized: false }; // Email not in any allowlist
  }

  // Check required type (admin can access everything)
  if (requiredType === "admin" && accessType !== "admin") {
    return { authorized: false };
  }

  // For kudos requirement, both admin and kudos users have access
  if (requiredType === "kudos" && accessType !== "admin" && accessType !== "kudos") {
    return { authorized: false };
  }

  return { authorized: true, type: accessType, userId, email };
}
