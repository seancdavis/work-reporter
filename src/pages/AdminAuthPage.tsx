import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { PageLoader } from "../components/LoadingSpinner";

function UnauthorizedMessage({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Access Denied
        </h2>
        <p className="text-red-600 mb-4">
          Your account is not authorized to access the admin area.
          Please sign in with an authorized Google account.
        </p>
        <Button onClick={onSignOut} variant="secondary">
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminAuthPage() {
  const { signInWithGoogle, session, accessType, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated with admin access
  useEffect(() => {
    if (session && accessType === "admin") {
      navigate("/admin/daily", { replace: true });
    }
  }, [session, accessType, navigate]);

  // Show loading while checking session
  if (loading) {
    return <PageLoader message="Checking authentication..." />;
  }

  // Show loading while redirecting
  if (session && accessType === "admin") {
    return <PageLoader message="Redirecting to admin..." />;
  }

  // Show error if authenticated but not authorized
  if (session && accessType !== "admin") {
    return <UnauthorizedMessage onSignOut={signOut} />;
  }

  const handleSignIn = () => {
    signInWithGoogle("/admin/daily");
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
        Admin Login
      </h1>
      <p className="text-gray-600 text-center mb-8">
        Sign in with your Google account to access the admin area.
      </p>

      <Button onClick={handleSignIn} className="w-full">
        Continue with Google
      </Button>
    </div>
  );
}
