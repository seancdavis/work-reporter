import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const baseNavItems = [
  { path: "/", label: "Daily" },
  { path: "/weekly", label: "Weekly" },
  { path: "/reports", label: "Reports" },
  { path: "/research", label: "Research" },
];

export function Layout() {
  const location = useLocation();
  const { user, permissions, signOut } = useAuth();
  const isResearchPage = location.pathname.startsWith("/research");

  // Build nav items based on permissions
  const navItems = [
    ...baseNavItems,
    // Only show Kudos if user has viewKudos permission
    ...(permissions.viewKudos ? [{ path: "/kudos", label: "Kudos" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                Work Tracker
              </Link>
              <nav className="flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {permissions.admin && (
                <Link
                  to="/admin/daily"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Admin
                </Link>
              )}
              {user && (
                <div className="flex items-center gap-3">
                  {user.image && (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-600">
                    {user.name || user.email}
                  </span>
                </div>
              )}
              <button
                onClick={signOut}
                className="text-sm text-gray-600 hover:text-gray-900"
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
