import { useState, useEffect } from "react";
import { weeklyStandups, type WeeklyStandup } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, cn } from "../../lib/utils";

export function WeeklyPublicPage() {
  const [standups, setStandups] = useState<WeeklyStandup[]>([]);
  const [, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(formatDate(getWeekStart()));

  // Fetch recent weekly standups
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const data = await weeklyStandups.list();
        setStandups(data);
      } catch (error) {
        console.error("Failed to fetch weekly standups:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Generate list of recent weeks
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    return formatDate(getWeekStart(date));
  });

  const currentStandup = standups.find((s) => s.week_start === selectedWeek);

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
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Weekly Planning</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          What Sean plans to accomplish this week.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Week selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Select Week</h2>
          <div className="space-y-1">
            {recentWeeks.map((weekStart) => {
              const hasStandup = standups.some((s) => s.week_start === weekStart);
              const weekStartDate = new Date(weekStart + "T00:00:00");
              return (
                <button
                  key={weekStart}
                  onClick={() => setSelectedWeek(weekStart)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                    selectedWeek === weekStart
                      ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] font-medium"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                    hasStandup && selectedWeek !== weekStart && "text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{getRelativeWeekLabel(weekStartDate)}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {getWeekRange(weekStartDate)}
                      </div>
                    </div>
                    {hasStandup && (
                      <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">
              {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
            </h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
              {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
            </p>

            {!currentStandup ? (
              <p className="text-[var(--color-text-tertiary)] text-sm py-4">
                No weekly planning recorded for this week.
              </p>
            ) : (
              <div className="space-y-8">
                {/* Planned Accomplishments */}
                {currentStandup.planned_accomplishments_html && (
                  <Section title="What Sean plans to accomplish this week">
                    <MarkdownContent html={currentStandup.planned_accomplishments_html} />
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
        </div>
      </div>
    </div>
  );
}
