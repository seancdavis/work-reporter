import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function AdminAuthPage() {
  const navigate = useNavigate();
  const { login, status, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(password, "admin");
      if (success) {
        navigate("/");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (status.authenticated && status.type === "admin") {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Admin Access Active
        </h1>
        <p className="text-gray-600 mb-6">
          You have full admin access to all features.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    );
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
