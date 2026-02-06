import { useState, useEffect } from "react";
import { dailyStandups, type DailyStandup } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
import { CardLoader } from "../../components/LoadingSpinner";
import { formatDate, formatDateDisplay, formatDateShort, getWeekdayDate, timeAgo, cn } from "../../lib/utils";

export function DailyPublicPage() {
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(getWeekdayDate()));

  // Fetch recent standups
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const data = await dailyStandups.list();
        setStandups(data);
      } catch (error) {
        console.error("Failed to fetch standups:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Generate list of recent weekdays (Mon-Fri only)
  const recentDates = (() => {
    const dates: string[] = [];
    const date = new Date();
    while (dates.length < 14) {
      const day = date.getDay();
      // Only include weekdays (1-5 = Mon-Fri)
      if (day >= 1 && day <= 5) {
        dates.push(formatDate(date));
      }
      date.setDate(date.getDate() - 1);
    }
    return dates;
  })();

  const currentStandup = standups.find((s) => s.date === selectedDate);

  // Filter linked issues for public view (hide SCD- prefixed issues)
  const visibleLinkedIssues = currentStandup?.linked_issues?.filter(
    (issue) => !issue.identifier.startsWith("SCD-")
  ) || [];

  // Section component for consistent styling
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
        {title}
      </h3>
      <div className="pl-4 border-l-2 border-[var(--color-border-primary)]">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Daily Standup</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          What Sean worked on and what's planned for today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Date selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Select Date</h2>
          <div className="space-y-1">
            {loading ? (
              // Skeleton for date list while loading
              Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full px-3 py-2 rounded-md animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-[var(--color-bg-active)] rounded w-24" />
                    <div className="w-2 h-2 bg-[var(--color-bg-active)] rounded-full" />
                  </div>
                </div>
              ))
            ) : (
              recentDates.map((date) => {
                const hasStandup = standups.some((s) => s.date === date);
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                      selectedDate === date
                        ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] font-medium"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                      hasStandup && selectedDate !== date && "text-[var(--color-text-primary)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{formatDateShort(date)}</span>
                      {hasStandup && (
                        <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <CardLoader lines={4} />
          ) : (
            <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                  {formatDateDisplay(selectedDate)}
                </h2>
                {currentStandup && (
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Updated {timeAgo(currentStandup.updated_at)}
                  </span>
                )}
              </div>

              {!currentStandup ? (
                <p className="text-[var(--color-text-tertiary)] text-sm py-4">
                  No standup recorded for this date.
                </p>
              ) : (
                <div className="space-y-8">
                  {/* Yesterday's Summary */}
                  {currentStandup.yesterday_summary_html && (
                    <Section title="What Sean accomplished yesterday">
                      <MarkdownContent html={currentStandup.yesterday_summary_html} />
                    </Section>
                  )}

                  {/* Today's Plan */}
                  {currentStandup.today_plan_html && (
                    <Section title="What Sean is working on today">
                      <MarkdownContent html={currentStandup.today_plan_html} />
                    </Section>
                  )}

                  {/* Blockers */}
                  {currentStandup.blockers_html && (
                    <Section title="Current blockers">
                      <MarkdownContent html={currentStandup.blockers_html} />
                    </Section>
                  )}

                  {/* Linked Issues */}
                  {visibleLinkedIssues.length > 0 && (
                    <Section title="Related issues">
                      <div className="flex flex-wrap gap-2">
                        {visibleLinkedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] border border-[var(--color-border-primary)]"
                          >
                            <span className="font-medium">{issue.identifier}</span>
                            <span className="text-[var(--color-accent-primary)]">{issue.title}</span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
