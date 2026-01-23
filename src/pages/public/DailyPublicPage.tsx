import { useState, useEffect } from "react";
import { dailyStandups, type DailyStandup } from "../../lib/api";
import { MarkdownContent } from "../../components/MarkdownContent";
import { CardLoader } from "../../components/LoadingSpinner";
import { formatDate, formatDateDisplay, formatDateShort, timeAgo, cn } from "../../lib/utils";

export function DailyPublicPage() {
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

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

  // Generate list of recent dates
  const recentDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date);
  });

  const currentStandup = standups.find((s) => s.date === selectedDate);

  // Filter linked issues for public view (hide SCD- prefixed issues)
  const visibleLinkedIssues = currentStandup?.linked_issues?.filter(
    (issue) => !issue.identifier.startsWith("SCD-")
  ) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Daily Standup</h1>
        <p className="text-gray-600 mt-1">
          What I worked on yesterday and what I'm planning for today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Date selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Select Date</h2>
          <div className="space-y-1">
            {loading ? (
              // Skeleton for date list while loading
              Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full px-3 py-2 rounded-md animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="w-2 h-2 bg-gray-200 rounded-full" />
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
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50",
                      hasStandup && selectedDate !== date && "text-gray-900"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{formatDateShort(date)}</span>
                      {hasStandup && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                {formatDateDisplay(selectedDate)}
              </h2>
              {currentStandup && (
                <p className="text-sm text-gray-500 mb-6">
                  Last updated: {timeAgo(currentStandup.updated_at)}
                </p>
              )}

              {!currentStandup ? (
                <p className="text-gray-500 text-sm py-4">
                  No standup recorded for this date.
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Yesterday's Summary */}
                  {currentStandup.yesterday_summary_html && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What did you accomplish yesterday?
                      </label>
                      <MarkdownContent html={currentStandup.yesterday_summary_html} />
                    </div>
                  )}

                  {/* Today's Plan */}
                  {currentStandup.today_plan_html && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What are you planning for today?
                      </label>
                      <MarkdownContent html={currentStandup.today_plan_html} />
                    </div>
                  )}

                  {/* Blockers */}
                  {currentStandup.blockers_html && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Any blockers?
                      </label>
                      <MarkdownContent html={currentStandup.blockers_html} />
                    </div>
                  )}

                  {/* Linked Issues */}
                  {visibleLinkedIssues.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Linked Issues
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {visibleLinkedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            <span className="font-medium">{issue.identifier}</span>
                            <span className="text-blue-600">{issue.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
