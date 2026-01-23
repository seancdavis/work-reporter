import { useState, useEffect } from "react";
import { weeklyStandups, type WeeklyStandup } from "../../lib/api";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Weekly Standup</h1>
        <p className="text-gray-600 mt-1">
          What I plan to accomplish this week.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Week selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Select Week</h2>
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
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50",
                    hasStandup && selectedWeek !== weekStart && "text-gray-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>{getRelativeWeekLabel(weekStartDate)}</div>
                      <div className="text-xs text-gray-500">
                        {getWeekRange(weekStartDate)}
                      </div>
                    </div>
                    {hasStandup && (
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
            </p>

            {!currentStandup ? (
              <p className="text-gray-500 text-sm py-4">
                No weekly standup recorded for this week.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Planned Accomplishments */}
                {currentStandup.planned_accomplishments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What do you plan to accomplish this week?
                    </label>
                    <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
                      {currentStandup.planned_accomplishments}
                    </p>
                  </div>
                )}

                {/* Goals */}
                {currentStandup.goals && currentStandup.goals.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals
                    </label>
                    <ul className="space-y-2">
                      {currentStandup.goals.map((goal, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                        >
                          <span className="flex-1 text-sm">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Linked Issues */}
                {currentStandup.linked_issues && currentStandup.linked_issues.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linked Issues
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentStandup.linked_issues.map((issue) => (
                        <span
                          key={issue.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {issue.identifier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
