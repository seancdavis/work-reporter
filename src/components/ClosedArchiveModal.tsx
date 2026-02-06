import { useState, useMemo } from "react";
import { type ResearchItem, type ResearchColumn } from "../lib/api";
import { timeAgo } from "../lib/utils";
import { Button } from "./Button";

interface ClosedArchiveModalProps {
  items: ResearchItem[];
  isAdmin: boolean;
  onClose: () => void;
  onItemClick: (item: ResearchItem) => void;
  onReopen?: (item: ResearchItem, targetColumn: ResearchColumn) => Promise<void>;
}

type SortField = "updated_at" | "title";
type SortDir = "asc" | "desc";

export function ClosedArchiveModal({
  items,
  isAdmin,
  onClose,
  onItemClick,
  onReopen,
}: ClosedArchiveModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const closedItems = useMemo(() => {
    let filtered = items.filter((item) => item.column === "closed");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.linear_issue_identifier.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === "updated_at") {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        cmp = a.title.localeCompare(b.title);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return filtered;
  }, [items, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleReopen = async (item: ResearchItem) => {
    if (!onReopen) return;
    await onReopen(item, "ideas");
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div
          className="relative w-full max-w-3xl bg-[var(--color-bg-elevated)] rounded-lg shadow-[var(--shadow-lg)] my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-primary)] px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Closed Items Archive
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="mt-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or identifier..."
                className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {closedItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                {searchQuery ? "No matching closed items" : "No closed items"}
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border-primary)]">
                    <th className="pb-2 font-medium">
                      <button
                        onClick={() => toggleSort("title")}
                        className="hover:text-[var(--color-text-secondary)]"
                      >
                        Title{sortIndicator("title")}
                      </button>
                    </th>
                    <th className="pb-2 font-medium w-24">ID</th>
                    <th className="pb-2 font-medium w-32">
                      <button
                        onClick={() => toggleSort("updated_at")}
                        className="hover:text-[var(--color-text-secondary)]"
                      >
                        Closed{sortIndicator("updated_at")}
                      </button>
                    </th>
                    {isAdmin && onReopen && <th className="pb-2 font-medium w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {closedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--color-border-primary)] last:border-b-0 hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <td className="py-2.5 pr-3">
                        <button
                          onClick={() => onItemClick(item)}
                          className="text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] text-left"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs text-[var(--color-accent-primary)]">
                          {item.linear_issue_identifier}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {timeAgo(item.updated_at)}
                        </span>
                      </td>
                      {isAdmin && onReopen && (
                        <td className="py-2.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReopen(item)}
                          >
                            Reopen
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-primary)] px-6 py-3 bg-[var(--color-bg-tertiary)] rounded-b-lg">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {closedItems.length} closed item{closedItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
