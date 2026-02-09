import { useState, useEffect } from "react";
import { kudos as kudosApi, type Kudo } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
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

  // Group kudos by year — within each year, chronological (oldest first)
  const kudosByYear = kudosList.reduce(
    (acc, kudo) => {
      const year = new Date(kudo.received_date + "T00:00:00").getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(kudo);
      return acc;
    },
    {} as Record<number, Kudo[]>
  );

  // Sort within each year: chronological order (oldest first)
  for (const year of Object.keys(kudosByYear)) {
    kudosByYear[Number(year)].sort((a, b) => {
      const dateCompare = a.received_date.localeCompare(b.received_date);
      if (dateCompare !== 0) return dateCompare;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

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
                      <div className="flex-1 min-w-0">
                        {/* Message is the primary content */}
                        <div className="text-[var(--color-text-primary)]">
                          {kudo.message_html ? (
                            <MarkdownContent html={kudo.message_html} />
                          ) : (
                            <p className="whitespace-pre-wrap">{kudo.message}</p>
                          )}
                        </div>

                        {/* Attribution line: sender + date */}
                        <div className="flex items-center gap-2 mt-3 text-sm text-[var(--color-text-tertiary)]">
                          <span>&mdash;</span>
                          <span className="font-medium text-[var(--color-text-secondary)]">
                            {kudo.sender_name}
                          </span>
                          <span>&middot;</span>
                          <span>{formatDateDisplay(kudo.received_date)}</span>
                        </div>

                        {/* Context rendered as markdown, no label */}
                        {kudo.context && (
                          <div className="mt-3 text-sm text-[var(--color-text-secondary)] border-l-2 border-[var(--color-border-secondary)] pl-3">
                            {kudo.context_html ? (
                              <MarkdownContent html={kudo.context_html} />
                            ) : (
                              <p className="whitespace-pre-wrap">{kudo.context}</p>
                            )}
                          </div>
                        )}

                        {/* Tags */}
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

                        {/* Screenshot: shown expanded if show_screenshot, otherwise as a link */}
                        {kudo.screenshot_blob_key && (
                          <div className="mt-4">
                            {kudo.show_screenshot === 1 ? (
                              <a
                                href={kudosApi.getScreenshotUrl(kudo.screenshot_blob_key)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={kudosApi.getScreenshotUrl(kudo.screenshot_blob_key)}
                                  alt="Screenshot"
                                  className="max-w-md rounded-lg border border-[var(--color-border-primary)] hover:opacity-90 transition-opacity cursor-pointer"
                                />
                              </a>
                            ) : (
                              <a
                                href={kudosApi.getScreenshotUrl(kudo.screenshot_blob_key)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                View screenshot
                              </a>
                            )}
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
