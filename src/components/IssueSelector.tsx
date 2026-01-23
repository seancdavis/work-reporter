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
        <label className="block text-sm font-medium text-gray-700">
          Linked Issues
        </label>
      )}

      {/* Selected issues */}
      {!hideSelectedDisplay && selectedIssues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIssues.map((issue) => (
            <span
              key={issue.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md"
            >
              <span className="font-medium">{issue.identifier}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(issue.id)}
                  className="text-blue-500 hover:text-blue-700"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {loading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
                ) : issues.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No issues found</div>
                ) : (
                  issues.map((issue) => {
                    const isSelected = selectedIssues.some((i) => i.id === issue.id);
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleSelect(issue)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2",
                          isSelected && "bg-blue-50"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            isSelected
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="font-medium text-gray-900">{issue.identifier}</span>
                        <span className="text-gray-600 truncate">{issue.title}</span>
                        <span className={cn(
                          "ml-auto text-xs px-2 py-0.5 rounded",
                          issue.state.type === "started" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"
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
