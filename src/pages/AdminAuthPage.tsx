import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { PageLoader } from "../components/LoadingSpinner";

export function AdminAuthPage() {
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already authenticated as admin
  useEffect(() => {
    if (status.authenticated && status.type === "admin") {
      navigate("/admin/daily", { replace: true });
    }
  }, [status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(password, "admin");
      if (success) {
        navigate("/admin/daily");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while redirecting
  if (status.authenticated && status.type === "admin") {
    return <PageLoader message="Redirecting to admin..." />;
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
        Admin Login
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          error={error}
          autoFocus
        />

        <Button type="submit" loading={loading} className="w-full">
          Login
        </Button>
      </form>
    </div>
  );
}
