import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Eye, Edit3, X, ChevronDown, ChevronUp } from "lucide-react";
import { weeklyStandups, dailyStandups, type WeeklyStandup, type DailyStandup } from "../../lib/api";
import { Button } from "../../components/Button";
import { TextArea } from "../../components/TextArea";
import { IssueSelector } from "../../components/IssueSelector";
import { MarkdownContent } from "../../components/MarkdownContent";
import { AICleanupButton } from "../../components/AICleanupButton";
import { CardLoader } from "../../components/LoadingSpinner";
import { useToast, ToastContainer } from "../../components/Toast";
import { useDraftStorage } from "../../hooks/useDraftStorage";
import { formatDate, getWeekStart, getWeekRange, getRelativeWeekLabel, cn } from "../../lib/utils";

export function WeeklyAdminPage() {
  const { week: weekParam } = useParams<{ week?: string }>();
  const navigate = useNavigate();
  const [standups, setStandups] = useState<WeeklyStandup[]>([]);
  const [lastWeekDailyStandups, setLastWeekDailyStandups] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedWeek = weekParam || formatDate(getWeekStart());

  // Redirect to URL with week if none provided
  useEffect(() => {
    if (!weekParam) {
      navigate(`/admin/weekly/${selectedWeek}`, { replace: true });
    }
  }, [weekParam, selectedWeek, navigate]);
  const { toasts, showToast, dismissToast, dismissing } = useToast();

  // Preview mode
  const [isPreview, setIsPreview] = useState(false);

  // Form state
  const [linkedIssues, setLinkedIssues] = useState<
    Array<{ id: string; identifier: string; title: string }>
  >([]);
  const [showCopyPreview, setShowCopyPreview] = useState(false);

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

  const currentStandup = standups.find((s) => s.week_start === selectedWeek);

  // Draft storage for text fields
  const accomplishmentsDraft = useDraftStorage({
    key: `draft:weekly:${selectedWeek}:planned_accomplishments`,
    savedValue: currentStandup?.planned_accomplishments || "",
  });

  // Load linked issues and reset preview when week changes
  useEffect(() => {
    const standup = standups.find((s) => s.week_start === selectedWeek);
    setLinkedIssues(standup?.linked_issues || []);
    setIsPreview(false);
    setShowCopyPreview(false);
  }, [selectedWeek, standups]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await weeklyStandups.save({
        week_start: selectedWeek,
        planned_accomplishments: accomplishmentsDraft.draftValue || undefined,
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

      accomplishmentsDraft.clearDraft();
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

  const lastWeekIssues = getLastWeekIssues();
  const hasLastWeekIssues = lastWeekIssues.length > 0;
  const hasSavedContent = !!currentStandup?.planned_accomplishments_html;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Weekly Planning</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Plan what you intend to accomplish this week.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Week selector sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-1">
              {recentWeeks.map((weekStart) => {
                const hasStandup = standups.some((s) => s.week_start === weekStart);
                const weekStartDate = new Date(weekStart + "T00:00:00");
                return (
                  <button
                    key={weekStart}
                    onClick={() => navigate(`/admin/weekly/${weekStart}`)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                      selectedWeek === weekStart
                        ? "bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] font-medium"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                      !loading && hasStandup && selectedWeek !== weekStart && "text-[var(--color-text-primary)]"
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
                      ) : hasStandup ? (
                        <span className="w-2 h-2 bg-[var(--color-success)] rounded-full flex-shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main form */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <CardLoader lines={4} />
            ) : (
            <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">
                {getRelativeWeekLabel(new Date(selectedWeek + "T00:00:00"))}
              </h2>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
                {getWeekRange(new Date(selectedWeek + "T00:00:00"))}
              </p>

              <div className="space-y-6">
                {/* Planned Accomplishments */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
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
                        <AICleanupButton
                          field="planned_accomplishments"
                          content={accomplishmentsDraft.draftValue}
                          onCleanup={accomplishmentsDraft.setDraftValue}
                        />
                      )}
                    </div>
                  </div>
                  {isPreview ? (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                        What Sean plans to accomplish this week
                      </h3>
                      <div className="pl-4 border-l-2 border-[var(--color-border-primary)]">
                        <MarkdownContent html={currentStandup?.planned_accomplishments_html || ""} />
                      </div>
                    </div>
                  ) : (
                    <TextArea
                      value={accomplishmentsDraft.draftValue}
                      onChange={(e) => accomplishmentsDraft.setDraftValue(e.target.value)}
                      placeholder="Describe your planned accomplishments..."
                      rows={4}
                    />
                  )}
                </div>

                {/* Linked Issues */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                      Linked Issues
                    </label>
                    {hasLastWeekIssues && (
                      <button
                        type="button"
                        onClick={() => setShowCopyPreview(!showCopyPreview)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-active)] transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy issues from last week's standups
                        {showCopyPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {showCopyPreview && hasLastWeekIssues && (() => {
                    const existingIds = new Set(linkedIssues.map((i) => i.id));
                    const newIssues = lastWeekIssues.filter((i) => !existingIds.has(i.id));
                    return (
                      <div className="mb-3 p-3 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
                        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                          {newIssues.length === 0
                            ? "All issues from last week are already linked."
                            : `${newIssues.length} issue${newIssues.length === 1 ? "" : "s"} will be added:`}
                        </p>
                        {newIssues.length > 0 && (
                          <>
                            <div className="space-y-1 mb-3">
                              {newIssues.map((issue) => (
                                <div key={issue.id} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-[var(--color-accent-text)] bg-[var(--color-accent-secondary)] px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                                    {issue.identifier}
                                  </span>
                                  <span className="text-[var(--color-text-secondary)] truncate">
                                    {issue.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                copyIssuesFromLastWeek();
                                setShowCopyPreview(false);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-primary-hover)] transition-colors"
                            >
                              Add {newIssues.length} issue{newIssues.length === 1 ? "" : "s"}
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}

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
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-[var(--color-accent-secondary)] border-[var(--color-border-primary)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm whitespace-nowrap text-[var(--color-accent-text)]">
                              {issue.identifier}
                            </span>
                            <span className="text-sm truncate text-[var(--color-accent-primary)]">
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

                <div className="flex items-center justify-end gap-3">
                  {accomplishmentsDraft.hasDraft && (
                    <span className="text-xs text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-2 py-1 rounded-[var(--radius-sm)]">
                      Unsaved draft
                    </span>
                  )}
                  <Button onClick={handleSave} loading={saving}>
                    Save Weekly Planning
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} dismissing={dismissing} />
    </>
  );
}
