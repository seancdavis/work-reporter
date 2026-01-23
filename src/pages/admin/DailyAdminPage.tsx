import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { dailyStandups, type DailyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { IssueSelector } from "../../components/IssueSelector";
import { AICleanupButton } from "../../components/AICleanupButton";
import { formatDate, formatDateDisplay, formatDateShort, timeAgo, cn } from "../../lib/utils";

export function DailyAdminPage() {
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);

  // Form state
  const [yesterdaySummary, setYesterdaySummary] = useState("");
  const [todayPlan, setTodayPlan] = useState("");
  const [blockers, setBlockers] = useState("");
  const [linkedIssues, setLinkedIssues] = useState<
    Array<{ id: string; identifier: string; title: string }>
  >([]);

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

  // Load selected date's standup
  useEffect(() => {
    const standup = standups.find((s) => s.date === selectedDate);
    if (standup) {
      setYesterdaySummary(standup.yesterday_summary || "");
      setTodayPlan(standup.today_plan || "");
      setBlockers(standup.blockers || "");
      setLinkedIssues(standup.linked_issues || []);
    } else {
      setYesterdaySummary("");
      setTodayPlan("");
      setBlockers("");
      setLinkedIssues([]);
    }
  }, [selectedDate, standups]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await dailyStandups.save({
        date: selectedDate,
        yesterday_summary: yesterdaySummary || undefined,
        today_plan: todayPlan || undefined,
        blockers: blockers || undefined,
        linked_issues: linkedIssues,
      });

      // Update local state
      setStandups((prev) => {
        const exists = prev.some((s) => s.date === selectedDate);
        if (exists) {
          return prev.map((s) => (s.date === selectedDate ? saved : s));
        }
        return [saved, ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
    } catch (error) {
      console.error("Failed to save standup:", error);
    } finally {
      setSaving(false);
    }
  };

  // Generate list of recent dates
  const recentDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date);
  });

  const currentStandup = standups.find((s) => s.date === selectedDate);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Daily Standup</h1>
        <p className="text-gray-600 mt-1">
          Record what you worked on yesterday and what you're planning for today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Date selector sidebar */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Select Date</h2>
          <div className="space-y-1">
            {recentDates.map((date) => {
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
            })}
          </div>
        </div>

        {/* Main form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {formatDateDisplay(selectedDate)}
            </h2>
            {currentStandup && (
              <p className="text-sm text-gray-500 mb-6">
                Last updated: {timeAgo(currentStandup.updated_at)}
              </p>
            )}

            <div className="space-y-6">
              {/* Yesterday's Summary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    What did you accomplish yesterday?
                  </label>
                  <AICleanupButton
                    field="yesterday_summary"
                    content={yesterdaySummary}
                    onCleanup={setYesterdaySummary}
                  />
                </div>
                <TextArea
                  value={yesterdaySummary}
                  onChange={(e) => setYesterdaySummary(e.target.value)}
                  placeholder="Describe what you completed..."
                  rows={3}
                />
              </div>

              {/* Today's Plan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    What are you planning for today?
                  </label>
                  <AICleanupButton
                    field="today_plan"
                    content={todayPlan}
                    onCleanup={setTodayPlan}
                  />
                </div>
                <TextArea
                  value={todayPlan}
                  onChange={(e) => setTodayPlan(e.target.value)}
                  placeholder="List your goals for today..."
                  rows={3}
                />
              </div>

              {/* Blockers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Any blockers?
                  </label>
                  <AICleanupButton
                    field="blockers"
                    content={blockers}
                    onCleanup={setBlockers}
                  />
                </div>
                <TextArea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Describe any blockers or issues..."
                  rows={2}
                />
              </div>

              {/* Linked Issues */}
              <div>
                <IssueSelector
                  selectedIssues={linkedIssues}
                  onSelect={setLinkedIssues}
                />
                {/* Show lock icon for private SCD- issues */}
                {linkedIssues.some((issue) => issue.identifier.startsWith("SCD-")) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {linkedIssues
                      .filter((issue) => issue.identifier.startsWith("SCD-"))
                      .map((issue) => (
                        <span
                          key={issue.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                        >
                          {issue.identifier}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} loading={saving}>
                  Save Standup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
