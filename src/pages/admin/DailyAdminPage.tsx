import { useState, useEffect } from "react";
import { Lock, Eye, Edit3, Copy, X } from "lucide-react";
import { dailyStandups, type DailyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { IssueSelector } from "../../components/IssueSelector";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { CardLoader } from "../../components/LoadingSpinner";
import { formatDate, formatDateDisplay, formatDateShort, timeAgo, cn } from "../../lib/utils";

type PreviewField = "yesterday_summary" | "today_plan" | "blockers";

export function DailyAdminPage() {
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);

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
    } catch (error) {
      console.error("Failed to save standup:", error);
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

  // Get yesterday's standup for copying issues
  const getYesterdayStandup = () => {
    const yesterday = new Date(selectedDate + "T00:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
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

  // Generate list of recent dates
  const recentDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date);
  });

  const currentStandup = standups.find((s) => s.date === selectedDate);
  const yesterdayStandup = getYesterdayStandup();
  const hasYesterdayIssues = (yesterdayStandup?.linked_issues?.length ?? 0) > 0;

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
          <label className="block text-sm font-medium text-gray-700">
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
                field={field}
                content={value}
                onCleanup={setValue}
              />
            )}
          </div>
        </div>
        {isPreview ? (
          <MarkdownContent html={getSavedHtml(field)} />
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
            {loading ? (
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

        {/* Main form */}
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
                    <label className="block text-sm font-medium text-gray-700">
                      Linked Issues
                    </label>
                    {hasYesterdayIssues && (
                      <button
                        type="button"
                        onClick={copyIssuesFromYesterday}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
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
                              ? "bg-gray-50 border-gray-200"
                              : "bg-blue-50 border-blue-100"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "font-medium text-sm whitespace-nowrap",
                              issue.identifier.startsWith("SCD-")
                                ? "text-gray-700"
                                : "text-blue-700"
                            )}>
                              {issue.identifier}
                            </span>
                            {issue.identifier.startsWith("SCD-") && (
                              <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-sm truncate",
                              issue.identifier.startsWith("SCD-")
                                ? "text-gray-600"
                                : "text-blue-600"
                            )}>
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
                    Save Standup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
