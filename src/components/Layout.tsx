import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const navItems = [
  { path: "/", label: "Daily" },
  { path: "/weekly", label: "Weekly" },
  { path: "/reports", label: "Reports" },
  { path: "/research", label: "Research" },
  { path: "/kudos", label: "Kudos" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { status, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {status.authenticated && status.type === "admin" && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Admin</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
