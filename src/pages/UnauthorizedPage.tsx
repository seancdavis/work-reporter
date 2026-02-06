import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";

interface UnauthorizedPageProps {
  requiredPermission?: "read" | "viewKudos" | "admin";
}

export function UnauthorizedPage({ requiredPermission }: UnauthorizedPageProps) {
  const { user, signOut } = useAuth();

  const getMessage = () => {
    switch (requiredPermission) {
      case "read":
        return "You don't have permission to view this page. Access is limited to Netlify employees.";
      case "viewKudos":
        return "You don't have permission to view kudos.";
      case "admin":
        return "You don't have permission to access the admin area.";
      default:
        return "Your account doesn't have access to Work Tracker.";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-danger-text)] mb-2">
            Access Denied
          </h2>
          <p className="text-[var(--color-danger)] mb-4">
            {getMessage()}
          </p>
          {user && (
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Signed in as {user.email}
            </p>
          )}
          <Button onClick={signOut} variant="secondary">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
