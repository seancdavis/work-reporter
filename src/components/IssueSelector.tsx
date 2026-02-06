import { useState, useEffect } from "react";
import { useLinearIssues } from "../hooks/useLinearIssues";
import type { LinearIssue } from "../lib/api";
import { cn } from "../lib/utils";

interface IssueSelectorProps {
  selectedIssues: Array<{ id: string; identifier: string; title: string }>;
  onSelect: (issues: Array<{ id: string; identifier: string; title: string }>) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  hideSelectedDisplay?: boolean;
}

export function IssueSelector({ selectedIssues, onSelect, disabled, hideLabel, hideSelectedDisplay }: IssueSelectorProps) {
  const { issues, loading, search } = useLinearIssues();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        search(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleSelect = (issue: LinearIssue) => {
    const isSelected = selectedIssues.some((i) => i.id === issue.id);
    if (isSelected) {
      onSelect(selectedIssues.filter((i) => i.id !== issue.id));
    } else {
      onSelect([...selectedIssues, { id: issue.id, identifier: issue.identifier, title: issue.title }]);
    }
  };

  const handleRemove = (issueId: string) => {
    onSelect(selectedIssues.filter((i) => i.id !== issueId));
  };

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
          Linked Issues
        </label>
      )}

      {/* Selected issues */}
      {!hideSelectedDisplay && selectedIssues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIssues.map((issue) => (
            <span
              key={issue.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] text-sm rounded-md"
            >
              <span className="font-medium">{issue.identifier}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(issue.id)}
                  className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search dropdown */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search issues by ID or title..."
            className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
          />

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-md shadow-[var(--shadow-lg)] max-h-60 overflow-auto">
                {loading ? (
                  <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">Loading...</div>
                ) : issues.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No issues found</div>
                ) : (
                  issues.map((issue) => {
                    const isSelected = selectedIssues.some((i) => i.id === issue.id);
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleSelect(issue)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-bg-hover)] flex items-center gap-2",
                          isSelected && "bg-[var(--color-accent-secondary)]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            isSelected
                              ? "bg-[var(--color-accent-primary)] border-[var(--color-accent-primary)] text-[var(--color-text-inverse)]"
                              : "border-[var(--color-border-secondary)]"
                          )}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)]">{issue.identifier}</span>
                        <span className="text-[var(--color-text-secondary)] truncate">{issue.title}</span>
                        <span className={cn(
                          "ml-auto text-xs px-2 py-0.5 rounded",
                          issue.state.type === "started"
                            ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
                            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                        )}>
                          {issue.state.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
