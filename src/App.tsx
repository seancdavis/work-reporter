import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { PageLoader } from "./components/LoadingSpinner";
import { AdminAuthPage } from "./pages/AdminAuthPage";
import { DailyPublicPage } from "./pages/public/DailyPublicPage";
import { WeeklyPublicPage } from "./pages/public/WeeklyPublicPage";
import { ReportsPublicPage } from "./pages/public/ReportsPublicPage";
import { ResearchPublicPage } from "./pages/public/ResearchPublicPage";
import { KudosPublicPage } from "./pages/public/KudosPublicPage";
import { DailyAdminPage } from "./pages/admin/DailyAdminPage";
import { WeeklyAdminPage } from "./pages/admin/WeeklyAdminPage";
import { ReportsAdminPage } from "./pages/admin/ReportsAdminPage";
import { ResearchAdminPage } from "./pages/admin/ResearchAdminPage";
import { KudosAdminPage } from "./pages/admin/KudosAdminPage";
import { AuthContext, useAuthProvider } from "./hooks/useAuth";

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

function AppContent() {
  const authValue = useAuthProvider();

  if (authValue.loading) {
    return <PageLoader message="Loading Work Tracker..." />;
  }

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <OAuthCallbackHandler refetch={authValue.refetch} />
        <Routes>
          {/* Public routes with public Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<DailyPublicPage />} />
            <Route path="/weekly" element={<WeeklyPublicPage />} />
            <Route path="/reports" element={<ReportsPublicPage />} />
            <Route path="/research" element={<ResearchPublicPage />} />
            <Route path="/research/:itemId" element={<ResearchPublicPage />} />
            <Route path="/kudos" element={<KudosPublicPage />} />
          </Route>

          {/* Admin login (standalone) */}
          <Route path="/admin" element={<AdminAuthPage />} />

          {/* Admin routes with AdminLayout auth gate */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/daily" element={<DailyAdminPage />} />
            <Route path="/admin/weekly" element={<WeeklyAdminPage />} />
            <Route path="/admin/reports" element={<ReportsAdminPage />} />
            <Route path="/admin/research" element={<ResearchAdminPage />} />
            <Route path="/admin/research/:itemId" element={<ResearchAdminPage />} />
            <Route path="/admin/kudos" element={<KudosAdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
