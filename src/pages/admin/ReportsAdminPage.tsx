import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, Edit3, Sparkles } from "lucide-react";
import { weeklyReports, dailyStandups, weeklyStandups, type WeeklyReport, type DailyStandup, type WeeklyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { CardLoader } from "../../components/LoadingSpinner";
import { useToast, ToastContainer } from "../../components/Toast";
import { useDraftStorage } from "../../hooks/useDraftStorage";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, formatDateShort, cn } from "../../lib/utils";

export function ReportsAdminPage() {
  const { week: weekParam } = useParams<{ week?: string }>();
  const navigate = useNavigate();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [dailyData, setDailyData] = useState<DailyStandup[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyStandup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedWeek = weekParam || formatDate(getWeekStart());

  // Redirect to URL with week if none provided
  useEffect(() => {
    if (!weekParam) {
      navigate(`/admin/reports/${selectedWeek}`, { replace: true });
    }
  }, [weekParam, selectedWeek, navigate]);
  const [generating, setGenerating] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

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

  const currentReport = reports.find((r) => r.week_start === selectedWeek);

  // Draft storage for summary field
  const summaryDraft = useDraftStorage({
    key: `draft:reports:${selectedWeek}:summary`,
    savedValue: currentReport?.summary || "",
  });

  // Reset preview mode when changing weeks
  useEffect(() => {
    setIsPreview(false);
  }, [selectedWeek]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await weeklyReports.save({
        week_start: selectedWeek,
        summary: summaryDraft.draftValue || undefined,
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

      summaryDraft.clearDraft();
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
      summaryDraft.setDraftValue(result.generated);
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

  const hasSavedContent = !!currentReport?.summary_html;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Weekly Reports</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Summarize your weekly accomplishments for stakeholders.
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
                    onClick={() => navigate(`/admin/reports/${weekStart}`)}
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
            {/* Summary textarea */}
            <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">
                Weekly Report: {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
              </h2>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
                {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
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
                              ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)]"
                              : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-active)]"
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
                                ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed"
                                : "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] hover:bg-[var(--color-bg-active)]"
                            )}
                          >
                            <Sparkles className="w-3 h-3" />
                            {generating ? "Generating..." : "AI Generate"}
                          </button>
                          <AICleanupButton
                            field="weekly_report"
                            content={summaryDraft.draftValue}
                            onCleanup={summaryDraft.setDraftValue}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {isPreview ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                        Weekly Summary
                      </h3>
                      <div className="pl-4 border-l-2 border-[var(--color-border-primary)]">
                        <MarkdownContent html={currentReport?.summary_html || ""} />
                      </div>
                    </div>
                  ) : (
                    <TextArea
                      value={summaryDraft.draftValue}
                      onChange={(e) => summaryDraft.setDraftValue(e.target.value)}
                      placeholder="Write or generate a summary of your week's accomplishments..."
                      rows={6}
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  {summaryDraft.hasDraft && (
                    <span className="text-xs text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-2 py-1 rounded-[var(--radius-sm)]">
                      Unsaved draft
                    </span>
                  )}
                  <Button onClick={handleSave} loading={saving}>
                    Save Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Weekly Planning Context */}
            {weeklyPlan && weeklyPlan.planned_accomplishments_html && (
              <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
                  What Was Planned This Week
                </h2>
                <div className="pl-4 border-l-2 border-[var(--color-accent-primary)]/30">
                  <MarkdownContent html={weeklyPlan.planned_accomplishments_html} />
                </div>
              </div>
            )}

            {/* Daily standups summary */}
            <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
                Daily Standups
              </h2>

              {dailyData.length === 0 ? (
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  No daily standups recorded for this week.
                </p>
              ) : (
                <div className="space-y-6">
                  {dailyData.map((standup) => (
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

                      {standup.today_plan_html && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                            What was planned
                          </span>
                          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            <MarkdownContent html={standup.today_plan_html} />
                          </div>
                        </div>
                      )}

                      {standup.linked_issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {standup.linked_issues.map((issue) => (
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
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
