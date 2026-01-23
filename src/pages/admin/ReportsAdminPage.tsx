import { useState, useEffect } from "react";
import { Eye, Edit3, Sparkles } from "lucide-react";
import { weeklyReports, dailyStandups, weeklyStandups, type WeeklyReport, type DailyStandup, type WeeklyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { useToast, ToastContainer } from "../../components/Toast";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, formatDateShort, cn } from "../../lib/utils";

export function ReportsAdminPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [dailyData, setDailyData] = useState<DailyStandup[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyStandup | null>(null);
  const [, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(formatDate(getWeekStart()));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  // Form state
  const [summary, setSummary] = useState("");

  // Preview mode
  const [isPreview, setIsPreview] = useState(false);

  // Fetch reports, daily standups, and weekly planning
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const [reportsData, dailyDataResult, weeklyPlanData] = await Promise.all([
          weeklyReports.list(),
          dailyStandups.list({ week: selectedWeek }),
          weeklyStandups.list(selectedWeek),
        ]);
        setReports(reportsData);
        setDailyData(dailyDataResult);
        setWeeklyPlan(weeklyPlanData.find(w => w.week_start === selectedWeek) || null);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [selectedWeek]);

  // Load selected week's report
  useEffect(() => {
    const report = reports.find((r) => r.week_start === selectedWeek);
    if (report) {
      setSummary(report.summary || "");
    } else {
      setSummary("");
    }
    // Reset preview mode when changing weeks
    setIsPreview(false);
  }, [selectedWeek, reports]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await weeklyReports.save({
        week_start: selectedWeek,
        summary: summary || undefined,
      });

      setReports((prev) => {
        const exists = prev.some((r) => r.week_start === selectedWeek);
        if (exists) {
          return prev.map((r) => (r.week_start === selectedWeek ? saved : r));
        }
        return [saved, ...prev].sort(
          (a, b) =>
            new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
        );
      });
      showToast("success", "Weekly report saved successfully");
    } catch (error) {
      console.error("Failed to save report:", error);
      showToast("error", "Failed to save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const result = await weeklyReports.generate(selectedWeek);
      setSummary(result.generated);
      showToast("success", "AI summary generated - review and save when ready");
    } catch (error) {
      console.error("Failed to generate report:", error);
      showToast("error", "Failed to generate report. Make sure you have daily standups for this week.");
    } finally {
      setGenerating(false);
    }
  };

  // Generate list of recent weeks
  const recentWeeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    return formatDate(getWeekStart(date));
  });

  const currentReport = reports.find((r) => r.week_start === selectedWeek);
  const hasSavedContent = !!currentReport?.summary_html;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Weekly Reports</h1>
          <p className="text-gray-600 mt-1">
            Summarize your weekly accomplishments for stakeholders.
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
            {/* Summary textarea */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Weekly Report: {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Summary
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
                        <>
                          <button
                            type="button"
                            onClick={handleGenerateReport}
                            disabled={generating || dailyData.length === 0}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors",
                              generating || dailyData.length === 0
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            )}
                          >
                            <Sparkles className="w-3 h-3" />
                            {generating ? "Generating..." : "AI Generate"}
                          </button>
                          <AICleanupButton
                            field="weekly_report"
                            content={summary}
                            onCleanup={setSummary}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {isPreview ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Weekly Summary
                      </h3>
                      <div className="pl-4 border-l-2 border-gray-200">
                        <MarkdownContent html={currentReport?.summary_html || ""} />
                      </div>
                    </div>
                  ) : (
                    <TextArea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Write or generate a summary of your week's accomplishments..."
                      rows={6}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>
                    Save Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Weekly Planning Context */}
            {weeklyPlan && weeklyPlan.planned_accomplishments_html && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  What Was Planned This Week
                </h2>
                <div className="pl-4 border-l-2 border-blue-200">
                  <MarkdownContent html={weeklyPlan.planned_accomplishments_html} />
                </div>
              </div>
            )}

            {/* Daily standups summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Daily Standups
              </h2>

              {dailyData.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No daily standups recorded for this week.
                </p>
              ) : (
                <div className="space-y-6">
                  {dailyData.map((standup) => (
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

                      {standup.today_plan_html && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            What was planned
                          </span>
                          <div className="mt-1 text-sm text-gray-600">
                            <MarkdownContent html={standup.today_plan_html} />
                          </div>
                        </div>
                      )}

                      {standup.linked_issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {standup.linked_issues.map((issue) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
