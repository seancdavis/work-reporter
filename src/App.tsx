import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { GlobalLoadingBar } from "./components/GlobalLoadingBar";
import { PageLoader } from "./components/LoadingSpinner";
import { SignInPage } from "./pages/SignInPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { DailyPublicPage } from "./pages/public/DailyPublicPage";
import { WeeklyPublicPage } from "./pages/public/WeeklyPublicPage";
import { ReportsPublicPage } from "./pages/public/ReportsPublicPage";
import { ResearchPublicPage } from "./pages/public/ResearchPublicPage";
import { ImpactPublicPage } from "./pages/public/ImpactPublicPage";
import { KudosPublicPage } from "./pages/public/KudosPublicPage";
import { DailyAdminPage } from "./pages/admin/DailyAdminPage";
import { WeeklyAdminPage } from "./pages/admin/WeeklyAdminPage";
import { ReportsAdminPage } from "./pages/admin/ReportsAdminPage";
import { ResearchAdminPage } from "./pages/admin/ResearchAdminPage";
import { ImpactAdminPage } from "./pages/admin/ImpactAdminPage";
import { KudosAdminPage } from "./pages/admin/KudosAdminPage";
import { AuthContext, useAuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeContext, useThemeProvider } from "./hooks/useTheme";
import { GlobalLoadingContext, useGlobalLoadingProvider } from "./hooks/useGlobalLoading";
import { registerLoadingCallbacks } from "./lib/api";

// Component to handle OAuth callback verifier cleanup
function OAuthCallbackHandler({ refetch }: { refetch: () => Promise<void> }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.has("neon_auth_session_verifier")) {
      refetch().then(() => {
        // Clean up URL after session is verified
        searchParams.delete("neon_auth_session_verifier");
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [searchParams, setSearchParams, refetch]);

  return null;
}

// Route guard for read permission (public pages)
function RequireRead({ children }: { children: React.ReactNode }) {
  const { permissions } = useAuth();
  if (!permissions.read) {
    return <UnauthorizedPage requiredPermission="read" />;
  }
  return <>{children}</>;
}

// Route guard for kudos permission
function RequireKudos({ children }: { children: React.ReactNode }) {
  const { permissions } = useAuth();
  if (!permissions.viewKudos) {
    return <UnauthorizedPage requiredPermission="viewKudos" />;
  }
  return <>{children}</>;
}

function AuthenticatedApp() {
  const { authenticated, permissions } = useAuth();

  // Not authenticated at all - show sign in
  if (!authenticated) {
    return <SignInPage />;
  }

  // Authenticated but no permissions - show unauthorized
  const hasAnyPermission = permissions.read || permissions.viewKudos || permissions.admin;
  if (!hasAnyPermission) {
    return <UnauthorizedPage />;
  }

  // Determine default route based on permissions
  const getDefaultRoute = () => {
    if (permissions.admin) return "/admin/daily";
    if (permissions.read) return "/daily";
    if (permissions.viewKudos) return "/kudos";
    return "/";
  };

  return (
    <Routes>
      {/* Public routes with read permission */}
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/daily" replace />} />
        <Route path="/daily" element={<RequireRead><DailyPublicPage /></RequireRead>} />
        <Route path="/daily/:date" element={<RequireRead><DailyPublicPage /></RequireRead>} />
        <Route path="/weekly" element={<RequireRead><WeeklyPublicPage /></RequireRead>} />
        <Route path="/weekly/:week" element={<RequireRead><WeeklyPublicPage /></RequireRead>} />
        <Route path="/reports" element={<RequireRead><ReportsPublicPage /></RequireRead>} />
        <Route path="/reports/:week" element={<RequireRead><ReportsPublicPage /></RequireRead>} />
        <Route path="/research" element={<RequireRead><ResearchPublicPage /></RequireRead>} />
        <Route path="/research/:itemId" element={<RequireRead><ResearchPublicPage /></RequireRead>} />
        <Route path="/impact" element={<RequireRead><ImpactPublicPage /></RequireRead>} />
        <Route path="/impact/:itemId" element={<RequireRead><ImpactPublicPage /></RequireRead>} />
        <Route path="/kudos" element={<RequireKudos><KudosPublicPage /></RequireKudos>} />
      </Route>

      {/* Admin routes with AdminLayout auth gate */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Navigate to="/admin/daily" replace />} />
        <Route path="/admin/daily" element={<DailyAdminPage />} />
        <Route path="/admin/daily/:date" element={<DailyAdminPage />} />
        <Route path="/admin/weekly" element={<WeeklyAdminPage />} />
        <Route path="/admin/weekly/:week" element={<WeeklyAdminPage />} />
        <Route path="/admin/reports" element={<ReportsAdminPage />} />
        <Route path="/admin/reports/:week" element={<ReportsAdminPage />} />
        <Route path="/admin/research" element={<ResearchAdminPage />} />
        <Route path="/admin/research/:itemId" element={<ResearchAdminPage />} />
        <Route path="/admin/impact" element={<ImpactAdminPage />} />
        <Route path="/admin/impact/:itemId" element={<ImpactAdminPage />} />
        <Route path="/admin/kudos" element={<KudosAdminPage />} />
      </Route>

      {/* Catch-all redirect to appropriate default */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

function AppContent() {
  const authValue = useAuthProvider();
  const themeValue = useThemeProvider();
  const globalLoadingValue = useGlobalLoadingProvider();

  // Register API loading callbacks
  useEffect(() => {
    registerLoadingCallbacks(
      globalLoadingValue.startLoading,
      globalLoadingValue.stopLoading
    );
  }, [globalLoadingValue.startLoading, globalLoadingValue.stopLoading]);

  if (authValue.loading) {
    return <PageLoader message="Loading Work Tracker..." />;
  }

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={authValue}>
        <GlobalLoadingContext.Provider value={globalLoadingValue}>
          <BrowserRouter>
            <GlobalLoadingBar />
            <OAuthCallbackHandler refetch={authValue.refetch} />
            <AuthenticatedApp />
          </BrowserRouter>
        </GlobalLoadingContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
