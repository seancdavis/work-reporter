import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";

export function SignInPage() {
  const { signInWithGoogle, user } = useAuth();

  const handleSignIn = () => {
    // Redirect back to current path after sign in
    signInWithGoogle(window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Work Tracker</h1>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Sign in with your Google account to continue.
          </p>
        </div>

        {user ? (
          // User has a session but no permissions yet (still loading)
          <p className="text-center text-[var(--color-text-tertiary)]">Checking permissions...</p>
        ) : (
          <Button onClick={handleSignIn} className="w-full">
            Continue with Google
          </Button>
        )}
      </div>
    </div>
  );
}
