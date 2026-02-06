import { useState, useEffect } from "react";
import { kudos as kudosApi, type Kudo } from "../../lib/api";
import { formatDateDisplay } from "../../lib/utils";

export function KudosPublicPage() {
  const [kudosList, setKudosList] = useState<Kudo[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Kudos</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          Recognition and positive feedback for promotion evidence.
        </p>
      </div>

      {/* Kudos List */}
      {loading ? (
        <p className="text-[var(--color-text-tertiary)]">Loading...</p>
      ) : kudosList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-tertiary)]">No kudos recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">{year}</h2>
              <div className="space-y-4">
                {kudosByYear[year].map((kudo) => (
                  <div
                    key={kudo.id}
                    className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6"
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {kudo.sender_name}
                          </span>
                          <span className="text-sm text-[var(--color-text-tertiary)]">
                            {formatDateDisplay(kudo.received_date)}
                          </span>
                        </div>
                        <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                          {kudo.message}
                        </p>
                        {kudo.context && (
                          <p className="mt-2 text-sm text-[var(--color-text-tertiary)] italic">
                            Context: {kudo.context}
                          </p>
                        )}
                        {kudo.tags && kudo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {kudo.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] px-2 py-0.5 rounded"
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
                              className="max-w-md rounded-lg border border-[var(--color-border-primary)]"
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
