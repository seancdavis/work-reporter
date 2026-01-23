import { useState, useEffect } from "react";
import { weeklyReports, dailyStandups, type WeeklyReport, type DailyStandup } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, formatDateShort, cn, timeAgo } from "../../lib/utils";

export function ReportsPublicPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [dailyData, setDailyData] = useState<DailyStandup[]>([]);
  const [, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(formatDate(getWeekStart()));

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
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h3>
      <div className="pl-4 border-l-2 border-gray-200">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Weekly Reports</h1>
        <p className="text-gray-600 mt-1">
          Summaries of weekly accomplishments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Week selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Select Week</h2>
          <div className="space-y-1">
            {recentWeeks.map((weekStart) => {
              const hasReport = reports.some((r) => r.week_start === weekStart);
              const weekStartDate = new Date(weekStart + "T00:00:00");
              return (
                <button
                  key={weekStart}
                  onClick={() => setSelectedWeek(weekStart)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                    selectedWeek === weekStart
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50",
                    hasReport && selectedWeek !== weekStart && "text-gray-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{getRelativeWeekLabel(weekStartDate)}</div>
                      <div className="text-xs text-gray-500">
                        {getWeekRange(weekStartDate)}
                      </div>
                    </div>
                    {hasReport && (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Weekly Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
              </h2>
              {currentReport && (
                <span className="text-sm text-gray-400">
                  Updated {timeAgo(currentReport.updated_at)}
                </span>
              )}
            </div>

            {!currentReport || !currentReport.summary_html ? (
              <p className="text-gray-500 text-sm py-4">
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Daily Standups
              </h2>

              <div className="space-y-6">
                {dailyData.map((standup) => {
                  const visibleIssues = filterIssues(standup.linked_issues);
                  return (
                    <div
                      key={standup.date}
                      className="border-l-2 border-gray-200 pl-4"
                    >
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {formatDateShort(standup.date)}
                      </h3>

                      {standup.yesterday_summary_html && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            What was accomplished
                          </span>
                          <div className="mt-1 text-sm text-gray-700">
                            <MarkdownContent html={standup.yesterday_summary_html} />
                          </div>
                        </div>
                      )}

                      {visibleIssues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {visibleIssues.map((issue) => (
                            <span
                              key={issue.id}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
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
        </div>
      </div>
    </div>
  );
}
