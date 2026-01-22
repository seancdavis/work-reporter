import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function AuthPage() {
  const navigate = useNavigate();
  const { login, status } = useAuth();
  const [password, setPassword] = useState("");
  const [authType, setAuthType] = useState<"admin" | "kudos">("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(password, authType);
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

  if (status.authenticated) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Already Logged In
        </h1>
        <p className="text-gray-600 mb-4">
          You're logged in as{" "}
          <span className="font-medium">
            {status.type === "admin" ? "Admin" : "Kudos"}
          </span>
        </p>
        <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
        Login
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Access Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="authType"
                value="admin"
                checked={authType === "admin"}
                onChange={() => setAuthType("admin")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Admin (Full Access)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="authType"
                value="kudos"
                checked={authType === "kudos"}
                onChange={() => setAuthType("kudos")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Kudos Only</span>
            </label>
          </div>
        </div>

        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
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
