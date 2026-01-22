import { useState, useEffect } from "react";
import { weeklyStandups, type WeeklyStandup } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { TextArea } from "../components/TextArea";
import { Input } from "../components/Input";
import { IssueSelector } from "../components/IssueSelector";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, cn } from "../lib/utils";

export function WeeklyPage() {
  const { status } = useAuth();
  const isAdmin = status.authenticated && status.type === "admin";

  const [standups, setStandups] = useState<WeeklyStandup[]>([]);
  const [, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(formatDate(getWeekStart()));
  const [saving, setSaving] = useState(false);

  // Form state
  const [plannedAccomplishments, setPlannedAccomplishments] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [linkedIssues, setLinkedIssues] = useState<
    Array<{ id: string; identifier: string; title: string }>
  >([]);

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

  // Load selected week's standup
  useEffect(() => {
    const standup = standups.find((s) => s.week_start === selectedWeek);
    if (standup) {
      setPlannedAccomplishments(standup.planned_accomplishments || "");
      setGoals(standup.goals || []);
      setLinkedIssues(standup.linked_issues || []);
    } else {
      setPlannedAccomplishments("");
      setGoals([]);
      setLinkedIssues([]);
    }
  }, [selectedWeek, standups]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await weeklyStandups.save({
        week_start: selectedWeek,
        planned_accomplishments: plannedAccomplishments || undefined,
        goals: goals,
        linked_issues: linkedIssues,
      });

      // Update local state
      setStandups((prev) => {
        const exists = prev.some((s) => s.week_start === selectedWeek);
        if (exists) {
          return prev.map((s) => (s.week_start === selectedWeek ? saved : s));
        }
        return [saved, ...prev].sort(
          (a, b) =>
            new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
        );
      });
    } catch (error) {
      console.error("Failed to save weekly standup:", error);
    } finally {
      setSaving(false);
    }
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  // Generate list of recent weeks
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    return formatDate(getWeekStart(date));
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Weekly Standup</h1>
        <p className="text-gray-600 mt-1">
          Plan what you intend to accomplish this week.
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

        {/* Main form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
            </p>

            <div className="space-y-6">
              <TextArea
                label="What do you plan to accomplish this week?"
                value={plannedAccomplishments}
                onChange={(e) => setPlannedAccomplishments(e.target.value)}
                placeholder="Describe your planned accomplishments..."
                rows={4}
                disabled={!isAdmin}
              />

              {/* Goals list */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Goals
                </label>

                {goals.length > 0 && (
                  <ul className="space-y-2">
                    {goals.map((goal, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                      >
                        <span className="flex-1 text-sm">{goal}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => removeGoal(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {isAdmin && (
                  <div className="flex gap-2">
                    <Input
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="Add a goal..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addGoal();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addGoal}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <IssueSelector
                selectedIssues={linkedIssues}
                onSelect={setLinkedIssues}
                disabled={!isAdmin}
              />

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>
                    Save Weekly Standup
                  </Button>
                </div>
              )}

              {!isAdmin && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Login as admin to edit weekly standups
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
