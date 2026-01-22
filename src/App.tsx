import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DailyPage } from "./pages/DailyPage";
import { WeeklyPage } from "./pages/WeeklyPage";
import { ReportsPage } from "./pages/ReportsPage";
import { KudosPage } from "./pages/KudosPage";
import { AuthPage } from "./pages/AuthPage";
import { AuthContext, useAuthProvider } from "./hooks/useAuth";

function AppContent() {
  const authValue = useAuthProvider();

  if (authValue.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DailyPage />} />
            <Route path="/weekly" element={<WeeklyPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/kudos" element={<KudosPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
