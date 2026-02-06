import { useState, useEffect } from "react";
import { Lock, Eye, Edit3, Copy, X } from "lucide-react";
import { dailyStandups, type DailyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { IssueSelector } from "../../components/IssueSelector";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { CardLoader } from "../../components/LoadingSpinner";
import { useToast, ToastContainer } from "../../components/Toast";
import { formatDate, formatDateDisplay, formatDateShort, getWeekdayDate, timeAgo, cn } from "../../lib/utils";

type PreviewField = "yesterday_summary" | "today_plan" | "blockers";

export function DailyAdminPage() {
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(getWeekdayDate()));
  const [saving, setSaving] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  // Preview mode for each field (only available for saved content)
  const [previewFields, setPreviewFields] = useState<Set<PreviewField>>(new Set());

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
    // Reset preview mode when changing dates
    setPreviewFields(new Set());
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

      showToast("success", "Standup saved successfully");
    } catch (error) {
      console.error("Failed to save standup:", error);
      showToast("error", "Failed to save standup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = (field: PreviewField) => {
    setPreviewFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  // Get the previous weekday (skips weekends)
  const getPreviousWeekday = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    date.setDate(date.getDate() - 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }
    return formatDate(date);
  };

  // Get yesterday's standup for copying issues (uses previous weekday)
  const getYesterdayStandup = () => {
    const yesterdayStr = getPreviousWeekday(selectedDate);
    return standups.find((s) => s.date === yesterdayStr);
  };

  const copyIssuesFromYesterday = () => {
    const yesterdayStandup = getYesterdayStandup();
    if (yesterdayStandup?.linked_issues?.length) {
      // Merge with existing issues, avoiding duplicates
      const existingIds = new Set(linkedIssues.map((i) => i.id));
      const newIssues = yesterdayStandup.linked_issues.filter(
        (i) => !existingIds.has(i.id)
      );
      setLinkedIssues([...linkedIssues, ...newIssues]);
    }
  };

  const removeIssue = (issueId: string) => {
    setLinkedIssues(linkedIssues.filter((i) => i.id !== issueId));
  };

  // Generate list of recent weekdays (Mon-Fri only)
  const recentDates = (() => {
    const dates: string[] = [];
    const date = new Date();
    while (dates.length < 14) {
      const day = date.getDay();
      // Only include weekdays (1-5 = Mon-Fri)
      if (day >= 1 && day <= 5) {
        dates.push(formatDate(date));
      }
      date.setDate(date.getDate() - 1);
    }
    return dates;
  })();

  const currentStandup = standups.find((s) => s.date === selectedDate);
  const yesterdayStandup = getYesterdayStandup();
  const hasYesterdayIssues = (yesterdayStandup?.linked_issues?.length ?? 0) > 0;
  const hasYesterdayPlan = !!yesterdayStandup?.today_plan;

  const copyPlanFromYesterday = () => {
    if (yesterdayStandup?.today_plan) {
      setYesterdaySummary(yesterdayStandup.today_plan);
    }
  };

  // Check if field has been saved (has HTML version)
  const hasSavedContent = (field: PreviewField) => {
    if (!currentStandup) return false;
    switch (field) {
      case "yesterday_summary":
        return !!currentStandup.yesterday_summary_html;
      case "today_plan":
        return !!currentStandup.today_plan_html;
      case "blockers":
        return !!currentStandup.blockers_html;
    }
  };

  const getSavedHtml = (field: PreviewField) => {
    if (!currentStandup) return "";
    switch (field) {
      case "yesterday_summary":
        return currentStandup.yesterday_summary_html || "";
      case "today_plan":
        return currentStandup.today_plan_html || "";
      case "blockers":
        return currentStandup.blockers_html || "";
    }
  };

  const getPreviewLabel = (field: PreviewField) => {
    switch (field) {
      case "yesterday_summary":
        return "What Sean accomplished yesterday";
      case "today_plan":
        return "What Sean is working on today";
      case "blockers":
        return "Current blockers";
    }
  };

  const renderFieldWithPreview = (
    field: PreviewField,
    label: string,
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    rows: number
  ) => {
    const isPreview = previewFields.has(field);
    const canPreview = hasSavedContent(field);

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
          <div className="flex items-center gap-2">
            {canPreview && (
              <button
                type="button"
                onClick={() => togglePreview(field)}
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
            {!isPreview && field === "yesterday_summary" && hasYesterdayPlan && (
              <button
                type="button"
                onClick={copyPlanFromYesterday}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-active)] transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy yesterday's plan
              </button>
            )}
            {!isPreview && (
              <AICleanupButton
                field={field}
                content={value}
                onCleanup={setValue}
              />
            )}
          </div>
        </div>
        {isPreview ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              {getPreviewLabel(field)}
            </h3>
            <div className="pl-4 border-l-2 border-[var(--color-border-primary)]">
              <MarkdownContent html={getSavedHtml(field)} />
            </div>
          </div>
        ) : (
          <TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Daily Standup</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Record what you worked on yesterday and what you're planning for today.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Date selector sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Select Date</h2>
            <div className="space-y-1">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full px-3 py-2 rounded-md animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-[var(--color-bg-active)] rounded w-24" />
                      <div className="w-2 h-2 bg-[var(--color-bg-active)] rounded-full" />
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
                          ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] font-medium"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                        hasStandup && selectedDate !== date && "text-[var(--color-text-primary)]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{formatDateShort(date)}</span>
                        {hasStandup && (
                          <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main form */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <CardLoader lines={4} />
            ) : (
              <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">
                  {formatDateDisplay(selectedDate)}
                </h2>
                {currentStandup && (
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
                    Last updated: {timeAgo(currentStandup.updated_at)}
                  </p>
                )}

                <div className="space-y-6">
                  {/* Yesterday's Summary */}
                  {renderFieldWithPreview(
                    "yesterday_summary",
                    "What did you accomplish yesterday?",
                    yesterdaySummary,
                    setYesterdaySummary,
                    "Describe what you completed...",
                    3
                  )}

                  {/* Today's Plan */}
                  {renderFieldWithPreview(
                    "today_plan",
                    "What are you planning for today?",
                    todayPlan,
                    setTodayPlan,
                    "List your goals for today...",
                    3
                  )}

                  {/* Blockers */}
                  {renderFieldWithPreview(
                    "blockers",
                    "Any blockers?",
                    blockers,
                    setBlockers,
                    "Describe any blockers or issues...",
                    2
                  )}

                  {/* Linked Issues */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                        Linked Issues
                      </label>
                      {hasYesterdayIssues && (
                        <button
                          type="button"
                          onClick={copyIssuesFromYesterday}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-active)] transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copy from yesterday
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
                            className={cn(
                              "flex items-center justify-between gap-2 px-3 py-2 rounded-md border",
                              issue.identifier.startsWith("SCD-")
                                ? "bg-[var(--color-bg-hover)] border-[var(--color-border-primary)]"
                                : "bg-[var(--color-accent-secondary)] border-[var(--color-border-primary)]"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "font-medium text-sm whitespace-nowrap",
                                issue.identifier.startsWith("SCD-")
                                  ? "text-[var(--color-text-secondary)]"
                                  : "text-[var(--color-accent-text)]"
                              )}>
                                {issue.identifier}
                              </span>
                              {issue.identifier.startsWith("SCD-") && (
                                <Lock className="w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0" />
                              )}
                              <span className={cn(
                                "text-sm truncate",
                                issue.identifier.startsWith("SCD-")
                                  ? "text-[var(--color-text-tertiary)]"
                                  : "text-[var(--color-accent-primary)]"
                              )}>
                                {issue.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeIssue(issue.id)}
                              className="flex-shrink-0 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
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
                      Save Standup
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
