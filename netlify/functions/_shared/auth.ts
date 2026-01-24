/**
 * Authentication utilities for Neon Auth (header-based + email allowlist)
 */

export interface AuthPermissions {
  read: boolean;       // Can view public pages (daily, weekly, reports, research)
  viewKudos: boolean;  // Can view kudos page
  admin: boolean;      // Can access admin pages
}

/**
 * Determines permissions based on email
 * - @netlify.com emails can read public pages
 * - MANAGER_EMAILS can view kudos (and future manager features)
 * - ADMIN_EMAILS can access admin (and implicitly everything else)
 */
export function getPermissionsFromEmail(email: string): AuthPermissions {
  const adminEmails = (Netlify.env.get("ADMIN_EMAILS") || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const managerEmails = (Netlify.env.get("MANAGER_EMAILS") || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const normalizedEmail = email.toLowerCase();
  const isAdmin = adminEmails.includes(normalizedEmail);
  const isManager = managerEmails.includes(normalizedEmail);
  const isNetlifyEmployee = normalizedEmail.endsWith("@netlify.com");

  return {
    read: isNetlifyEmployee || isAdmin,
    viewKudos: isManager || isAdmin,
    admin: isAdmin,
  };
}

/**
 * Validates request authentication using headers and returns permissions
 */
export async function requireAuth(
  req: Request
): Promise<{ authenticated: boolean; userId?: string; email?: string; permissions?: AuthPermissions }> {
  const userId = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");

  if (!userId || !email) {
    return { authenticated: false };
  }

  const permissions = getPermissionsFromEmail(email);

  // User is authenticated if they have any permission
  const hasAnyPermission = permissions.read || permissions.viewKudos || permissions.admin;

  if (!hasAnyPermission) {
    return { authenticated: false };
  }

  return { authenticated: true, userId, email, permissions };
}

/**
 * Check if request has admin permission
 */
export async function requireAdmin(req: Request): Promise<{ authorized: boolean; userId?: string; email?: string }> {
  const result = await requireAuth(req);
  if (!result.authenticated || !result.permissions?.admin) {
    return { authorized: false };
  }
  return { authorized: true, userId: result.userId, email: result.email };
}
