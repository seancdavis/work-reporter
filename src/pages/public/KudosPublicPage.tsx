import { useState, useEffect } from "react";
import { kudos as kudosApi, type Kudo } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { formatDateDisplay } from "../../lib/utils";

export function KudosPublicPage() {
  const { status, login } = useAuth();
  const isAuthenticated = status.authenticated && (status.type === "admin" || status.type === "kudos");

  // Login gate state
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [kudosList, setKudosList] = useState<Kudo[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle kudos login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    try {
      const success = await login(password, "kudos");
      if (!success) {
        setLoginError("Invalid password");
      }
    } catch (err) {
      setLoginError("Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  // Fetch kudos
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const data = await kudosApi.list();
        setKudosList(data);
      } catch (error) {
        console.error("Failed to fetch kudos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Group kudos by year
  const kudosByYear = kudosList.reduce(
    (acc, kudo) => {
      const year = new Date(kudo.received_date + "T00:00:00").getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(kudo);
      return acc;
    },
    {} as Record<number, Kudo[]>
  );

  const years = Object.keys(kudosByYear)
    .map(Number)
    .sort((a, b) => b - a);

  // Login gate - require authentication to view kudos
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Kudos</h1>
          <p className="text-gray-600 mt-2">
            Login to view kudos.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter kudos password"
            error={loginError}
            autoFocus
          />

          <Button type="submit" loading={loggingIn} className="w-full">
            Login
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Kudos</h1>
        <p className="text-gray-600 mt-1">
          Recognition and positive feedback for promotion evidence.
        </p>
      </div>

      {/* Kudos List */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : kudosList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No kudos recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-lg font-medium text-gray-900 mb-4">{year}</h2>
              <div className="space-y-4">
                {kudosByYear[year].map((kudo) => (
                  <div
                    key={kudo.id}
                    className="bg-white rounded-lg border border-gray-200 p-6"
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {kudo.sender_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDateDisplay(kudo.received_date)}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {kudo.message}
                        </p>
                        {kudo.context && (
                          <p className="mt-2 text-sm text-gray-500 italic">
                            Context: {kudo.context}
                          </p>
                        )}
                        {kudo.tags && kudo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {kudo.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {kudo.screenshot_blob_key && (
                          <div className="mt-4">
                            <img
                              src={kudosApi.getScreenshotUrl(kudo.screenshot_blob_key)}
                              alt="Screenshot"
                              className="max-w-md rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
