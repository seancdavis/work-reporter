import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { weeklyReports, dailyStandups, type WeeklyReport, type DailyStandup } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
import { CardLoader } from "../../components/LoadingSpinner";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, formatDateShort, cn, timeAgo } from "../../lib/utils";

export function ReportsPublicPage() {
  const { week: weekParam } = useParams<{ week?: string }>();
  const navigate = useNavigate();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [dailyData, setDailyData] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedWeek = weekParam || formatDate(getWeekStart());

  // Redirect to URL with week if none provided
  useEffect(() => {
    if (!weekParam) {
      navigate(`/reports/${selectedWeek}`, { replace: true });
    }
  }, [weekParam, selectedWeek, navigate]);

  // Fetch reports and daily standups
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const [reportsData, dailyDataResult] = await Promise.all([
          weeklyReports.list(),
          dailyStandups.list({ week: selectedWeek }),
        ]);
        setReports(reportsData);
        setDailyData(dailyDataResult);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [selectedWeek]);

  // Generate list of recent weeks
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    return formatDate(getWeekStart(date));
  });

  const currentReport = reports.find((r) => r.week_start === selectedWeek);

  // Filter linked issues for public view (hide SCD- prefixed issues)
  const filterIssues = (issues: Array<{ id: string; identifier: string; title: string }>) =>
    issues.filter((issue) => !issue.identifier.startsWith("SCD-"));

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
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Weekly Reports</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          Summaries of weekly accomplishments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Week selector sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-1">
            {recentWeeks.map((weekStart) => {
              const hasReport = reports.some((r) => r.week_start === weekStart);
              const weekStartDate = new Date(weekStart + "T00:00:00");
              return (
                <button
                  key={weekStart}
                  onClick={() => navigate(`/reports/${weekStart}`)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                    selectedWeek === weekStart
                      ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] font-medium"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                    !loading && hasReport && selectedWeek !== weekStart && "text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{getRelativeWeekLabel(weekStartDate)}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {getWeekRange(weekStartDate)}
                      </div>
                    </div>
                    {loading ? (
                      <span className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full flex-shrink-0 animate-pulse" />
                    ) : hasReport ? (
                      <span className="w-2 h-2 bg-[var(--color-success)] rounded-full flex-shrink-0" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <CardLoader lines={4} />
          ) : (
          <>
          {/* Weekly Summary */}
          <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
              </h2>
              {currentReport && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  Updated {timeAgo(currentReport.updated_at)}
                </span>
              )}
            </div>

            {!currentReport || !currentReport.summary_html ? (
              <p className="text-[var(--color-text-tertiary)] text-sm py-4">
                No summary for this week yet.
              </p>
            ) : (
              <Section title="Weekly Summary">
                <MarkdownContent html={currentReport.summary_html} />
              </Section>
            )}
          </div>

          {/* Daily standups summary */}
          {dailyData.length > 0 && (
            <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
                Daily Standups
              </h2>

              <div className="space-y-6">
                {dailyData.map((standup) => {
                  const visibleIssues = filterIssues(standup.linked_issues);
                  return (
                    <div
                      key={standup.date}
                      className="border-l-2 border-[var(--color-border-primary)] pl-4"
                    >
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                        {formatDateShort(standup.date)}
                      </h3>

                      {standup.yesterday_summary_html && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                            What was accomplished
                          </span>
                          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            <MarkdownContent html={standup.yesterday_summary_html} />
                          </div>
                        </div>
                      )}

                      {visibleIssues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {visibleIssues.map((issue) => (
                            <span
                              key={issue.id}
                              className="text-xs bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] px-2 py-0.5 rounded"
                              title={issue.title}
                            >
                              {issue.identifier}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
