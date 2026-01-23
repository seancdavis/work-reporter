import { useState, useEffect } from "react";
import { weeklyReports, dailyStandups, type WeeklyReport, type DailyStandup } from "../../lib/api";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, formatDateShort, cn } from "../../lib/utils";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Weekly Reports</h1>
        <p className="text-gray-600 mt-1">
          AI-generated summaries of weekly accomplishments.
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
          {/* Daily standups summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Daily Standups for {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
            </h2>

            {dailyData.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No daily standups recorded for this week.
              </p>
            ) : (
              <div className="space-y-4">
                {dailyData.map((standup) => (
                  <div
                    key={standup.date}
                    className="border-l-2 border-gray-200 pl-4"
                  >
                    <h3 className="text-sm font-medium text-gray-900">
                      {formatDateShort(standup.date)}
                    </h3>
                    {standup.yesterday_summary && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Yesterday:</span>{" "}
                        {standup.yesterday_summary}
                      </p>
                    )}
                    {standup.today_plan && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Today:</span>{" "}
                        {standup.today_plan}
                      </p>
                    )}
                    {standup.linked_issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {standup.linked_issues
                          .filter((issue) => !issue.identifier.startsWith("SCD-"))
                          .map((issue) => (
                            <span
                              key={issue.id}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                            >
                              {issue.identifier}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Report */}
          {currentReport && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  AI-Generated Summary
                </h2>
                <span className="text-xs text-gray-500">
                  Generated:{" "}
                  {new Date(currentReport.updated_at).toLocaleString()}
                </span>
              </div>

              {/* Metrics */}
              {currentReport.metrics && (
                <div className="flex gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-gray-900">
                      {currentReport.metrics.daysReported || 0}
                    </div>
                    <div className="text-xs text-gray-500">Days Reported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-gray-900">
                      {currentReport.metrics.issuesWorkedOn || 0}
                    </div>
                    <div className="text-xs text-gray-500">Issues Worked</div>
                  </div>
                </div>
              )}

              {/* Summary */}
              {currentReport.ai_summary && (
                <div className="prose prose-sm max-w-none mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {currentReport.ai_summary}
                  </p>
                </div>
              )}

              {/* Highlights */}
              {currentReport.highlights && currentReport.highlights.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Key Highlights
                  </h3>
                  <ul className="space-y-2">
                    {currentReport.highlights.map((highlight, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-green-500 mt-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!currentReport && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-500 text-sm">
                No AI summary generated for this week yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
