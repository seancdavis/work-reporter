import { useState, useEffect } from "react";
import { Copy, Eye, Edit3, X } from "lucide-react";
import { weeklyStandups, dailyStandups, type WeeklyStandup, type DailyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { IssueSelector } from "../../components/IssueSelector";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { useToast, ToastContainer } from "../../components/Toast";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, cn } from "../../lib/utils";

export function WeeklyAdminPage() {
  const [standups, setStandups] = useState<WeeklyStandup[]>([]);
  const [lastWeekDailyStandups, setLastWeekDailyStandups] = useState<DailyStandup[]>([]);
  const [, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(formatDate(getWeekStart()));
  const [saving, setSaving] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  // Preview mode
  const [isPreview, setIsPreview] = useState(false);

  // Form state
  const [plannedAccomplishments, setPlannedAccomplishments] = useState("");
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

  // Fetch last week's daily standups when selected week changes
  useEffect(() => {
    async function fetchLastWeekDailies() {
      // Calculate last week's date range
      const selectedWeekStart = new Date(selectedWeek + "T00:00:00");
      const lastWeekStart = new Date(selectedWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      try {
        const data = await dailyStandups.list({ week: formatDate(lastWeekStart) });
        setLastWeekDailyStandups(data);
      } catch (error) {
        console.error("Failed to fetch last week's daily standups:", error);
      }
    }
    fetchLastWeekDailies();
  }, [selectedWeek]);

  // Load selected week's standup
  useEffect(() => {
    const standup = standups.find((s) => s.week_start === selectedWeek);
    if (standup) {
      setPlannedAccomplishments(standup.planned_accomplishments || "");
      setLinkedIssues(standup.linked_issues || []);
    } else {
      setPlannedAccomplishments("");
      setLinkedIssues([]);
    }
    // Reset preview mode when changing weeks
    setIsPreview(false);
  }, [selectedWeek, standups]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await weeklyStandups.save({
        week_start: selectedWeek,
        planned_accomplishments: plannedAccomplishments || undefined,
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
      showToast("success", "Weekly planning saved successfully");
    } catch (error) {
      console.error("Failed to save weekly standup:", error);
      showToast("error", "Failed to save weekly planning. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeIssue = (issueId: string) => {
    setLinkedIssues(linkedIssues.filter((i) => i.id !== issueId));
  };

  // Get unique issues from last week's daily standups
  const getLastWeekIssues = () => {
    const issueMap = new Map<string, { id: string; identifier: string; title: string }>();
    for (const standup of lastWeekDailyStandups) {
      for (const issue of standup.linked_issues || []) {
        if (!issueMap.has(issue.id)) {
          issueMap.set(issue.id, issue);
        }
      }
    }
    return Array.from(issueMap.values());
  };

  const copyIssuesFromLastWeek = () => {
    const lastWeekIssues = getLastWeekIssues();
    if (lastWeekIssues.length > 0) {
      // Merge with existing issues, avoiding duplicates
      const existingIds = new Set(linkedIssues.map((i) => i.id));
      const newIssues = lastWeekIssues.filter((i) => !existingIds.has(i.id));
      setLinkedIssues([...linkedIssues, ...newIssues]);
    }
  };

  // Generate list of recent weeks
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    return formatDate(getWeekStart(date));
  });

  const currentStandup = standups.find((s) => s.week_start === selectedWeek);
  const lastWeekIssues = getLastWeekIssues();
  const hasLastWeekIssues = lastWeekIssues.length > 0;
  const hasSavedContent = !!currentStandup?.planned_accomplishments_html;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Weekly Planning</h1>
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
                {/* Planned Accomplishments */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      What do you plan to accomplish this week?
                    </label>
                    <div className="flex items-center gap-2">
                      {hasSavedContent && (
                        <button
                          type="button"
                          onClick={() => setIsPreview(!isPreview)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                            isPreview
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {isPreview ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              Preview
                            </>
                          )}
                        </button>
                      )}
                      {!isPreview && (
                        <AICleanupButton
                          field="planned_accomplishments"
                          content={plannedAccomplishments}
                          onCleanup={setPlannedAccomplishments}
                        />
                      )}
                    </div>
                  </div>
                  {isPreview ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        What Sean plans to accomplish this week
                      </h3>
                      <div className="pl-4 border-l-2 border-gray-200">
                        <MarkdownContent html={currentStandup?.planned_accomplishments_html || ""} />
                      </div>
                    </div>
                  ) : (
                    <TextArea
                      value={plannedAccomplishments}
                      onChange={(e) => setPlannedAccomplishments(e.target.value)}
                      placeholder="Describe your planned accomplishments..."
                      rows={4}
                    />
                  )}
                </div>

                {/* Linked Issues */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Linked Issues
                    </label>
                    {hasLastWeekIssues && (
                      <button
                        type="button"
                        onClick={copyIssuesFromLastWeek}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy from last week
                      </button>
                    )}
                  </div>

                  <IssueSelector
                    selectedIssues={linkedIssues}
                    onSelect={setLinkedIssues}
                    hideLabel
                    hideSelectedDisplay
                  />

                  {/* Display linked issues with titles */}
                  {linkedIssues.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {linkedIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-blue-50 border-blue-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm whitespace-nowrap text-blue-700">
                              {issue.identifier}
                            </span>
                            <span className="text-sm truncate text-blue-600">
                              {issue.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIssue(issue.id)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>
                    Save Weekly Planning
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
