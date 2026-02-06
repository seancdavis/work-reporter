import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../lib/utils";

const adminNavItems = [
  { path: "/admin/daily", label: "Daily" },
  { path: "/admin/weekly", label: "Weekly" },
  { path: "/admin/reports", label: "Reports" },
  { path: "/admin/research", label: "Research" },
  { path: "/admin/kudos", label: "Kudos" },
];

export function AdminLayout() {
  const location = useLocation();
  const { user, permissions, signOut } = useAuth();

  const isResearchPage = location.pathname.startsWith("/admin/research");

  // Redirect if not admin
  if (!permissions.admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <header className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/admin/daily" className="flex items-center gap-2">
                <span className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Work Tracker
                </span>
                <span className="text-xs bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] px-2 py-0.5 rounded-[var(--radius-sm)] font-medium">
                  Admin
                </span>
              </Link>
              <nav className="flex gap-1">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user && (
                <div className="flex items-center gap-3">
                  {user.image && (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {user.name || user.email}
                  </span>
                </div>
              )}
              <Link
                to="/"
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                View Public Site
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 py-8",
        isResearchPage ? "max-w-[1600px]" : "max-w-5xl"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
