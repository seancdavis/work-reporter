import { useState, useEffect } from "react";
import { dailyStandups, type DailyStandup } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { TextArea } from "../components/TextArea";
import { IssueSelector } from "../components/IssueSelector";
import { formatDate, formatDateDisplay, formatDateShort, cn } from "../lib/utils";

export function DailyPage() {
  const { status } = useAuth();
  const isAdmin = status.authenticated && status.type === "admin";

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
                Last updated:{" "}
                {new Date(currentStandup.updated_at).toLocaleString()}
              </p>
            )}

            <div className="space-y-6">
              <TextArea
                label="What did you accomplish yesterday?"
                value={yesterdaySummary}
                onChange={(e) => setYesterdaySummary(e.target.value)}
                placeholder="Describe what you completed..."
                rows={4}
                disabled={!isAdmin}
              />

              <TextArea
                label="What are you planning for today?"
                value={todayPlan}
                onChange={(e) => setTodayPlan(e.target.value)}
                placeholder="List your goals for today..."
                rows={4}
                disabled={!isAdmin}
              />

              <TextArea
                label="Any blockers?"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Describe any blockers or issues..."
                rows={2}
                disabled={!isAdmin}
              />

              <IssueSelector
                selectedIssues={linkedIssues}
                onSelect={setLinkedIssues}
                disabled={!isAdmin}
              />

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>
                    Save Standup
                  </Button>
                </div>
              )}

              {!isAdmin && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Login as admin to edit standups
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
