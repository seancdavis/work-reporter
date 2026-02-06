import { useState, useRef, useCallback } from "react";
import { type ResearchItem, type ResearchColumn, research } from "../lib/api";
import { cn } from "../lib/utils";

// Strip markdown syntax for plain text preview
function stripMarkdown(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove bullet points
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Remove numbered lists
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Collapse multiple spaces/newlines
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface KanbanBoardProps {
  items: ResearchItem[];
  onItemsChange: (items: ResearchItem[]) => void;
  onItemUpdate: (id: number, data: { column?: ResearchColumn }) => Promise<void>;
  onItemClick: (item: ResearchItem) => void;
  onItemDelete: (id: number) => Promise<void>;
  isAdmin: boolean;
}

const COLUMNS: { key: ResearchColumn; label: string }[] = [
  { key: "ideas", label: "Ideas" },
  { key: "exploring", label: "Exploring" },
  { key: "discussing", label: "Discussing" },
  { key: "closed", label: "Closed" },
];

interface DropTarget {
  column: ResearchColumn;
  index: number; // position in the column's sorted items
}

export function KanbanBoard({
  items,
  onItemsChange,
  onItemUpdate: _onItemUpdate,
  onItemClick,
  onItemDelete,
  isAdmin,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const getColumnItems = useCallback(
    (column: ResearchColumn) =>
      items
        .filter((item) => item.column === column)
        .sort((a, b) => a.display_order - b.display_order),
    [items]
  );

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    if (!isAdmin) return;
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId.toString());
  };

  const handleDragOverCard = (e: React.DragEvent, column: ResearchColumn, cardIndex: number) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const cardEl = e.currentTarget as HTMLElement;
    const rect = cardEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? cardIndex : cardIndex + 1;

    setDropTarget({ column, index: insertIndex });
  };

  const handleDragOverColumn = (e: React.DragEvent, column: ResearchColumn) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Only set drop target to end of column if not hovering over a card
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-column-area]")) {
      const columnItems = getColumnItems(column);
      setDropTarget({ column, index: columnItems.length });
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: ResearchColumn) => {
    if (!isAdmin) return;
    e.preventDefault();

    const itemId = parseInt(e.dataTransfer.getData("text/plain"));
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const target = dropTarget || { column: targetColumn, index: getColumnItems(targetColumn).length };
    const columnItems = getColumnItems(target.column).filter((i) => i.id !== itemId);

    // Calculate new display orders for all items in the target column
    const reorderedItems: Array<{ id: number; column: ResearchColumn; display_order: number }> = [];
    const updatedItems = [...items];

    // Insert the dragged item at the target position
    columnItems.splice(target.index > columnItems.length ? columnItems.length : target.index, 0, item);

    // Assign sequential display_order values
    columnItems.forEach((colItem, idx) => {
      reorderedItems.push({ id: colItem.id, column: target.column, display_order: idx });
      const itemIndex = updatedItems.findIndex((i) => i.id === colItem.id);
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], column: target.column, display_order: idx };
      }
    });

    // Optimistic update
    onItemsChange(updatedItems);
    setDraggingId(null);
    setDropTarget(null);

    // Persist to backend
    try {
      await research.reorder(reorderedItems);
    } catch (error) {
      // Revert on error
      onItemsChange(items);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent, item: ResearchItem) => {
    // Don't open modal if clicking on delete button or links
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
      return;
    }
    onItemClick(item);
  };

  const renderDropIndicator = () => (
    <div className="h-0.5 bg-[var(--color-accent-primary)] rounded-full mx-1 my-1" />
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnItems = getColumnItems(column.key);
        return (
          <div
            key={column.key}
            className="flex-shrink-0 w-72 rounded-lg p-3 bg-[var(--color-bg-tertiary)]"
            onDragOver={(e) => handleDragOverColumn(e, column.key)}
            onDrop={(e) => handleDrop(e, column.key)}
            onDragLeave={handleDragLeave}
          >
            <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center justify-between">
              <span>{column.label}</span>
              <span className="text-sm text-[var(--color-text-tertiary)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">
                {columnItems.length}
              </span>
            </h3>

            <div className="space-y-2 min-h-[200px]" data-column-area>
              {columnItems.map((item, index) => {
                const isPrivate = item.linear_issue_identifier.startsWith("SCD-");
                const showDropBefore =
                  dropTarget?.column === column.key &&
                  dropTarget.index === index &&
                  draggingId !== null &&
                  draggingId !== item.id;
                const showDropAfter =
                  dropTarget?.column === column.key &&
                  dropTarget.index === index + 1 &&
                  draggingId !== null &&
                  draggingId !== item.id &&
                  index === columnItems.length - 1;

                return (
                  <div key={item.id}>
                    {showDropBefore && renderDropIndicator()}
                    <div
                      ref={(el) => {
                        if (el) cardRefs.current.set(`${column.key}-${index}`, el);
                      }}
                      draggable={isAdmin}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={(e) => handleDragOverCard(e, column.key, index)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handleCardClick(e, item)}
                      className={cn(
                        "bg-[var(--color-bg-elevated)] rounded-md p-3 shadow-[var(--shadow-sm)] border border-[var(--color-border-primary)] relative group",
                        isAdmin && "cursor-grab active:cursor-grabbing",
                        !isAdmin && "cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow",
                        draggingId === item.id && "opacity-50"
                      )}
                    >
                      {/* Title */}
                      <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 hover:text-[var(--color-accent-primary)]">
                        {item.title}
                      </p>

                      {/* Description preview */}
                      {item.description && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">
                          {stripMarkdown(item.description)}
                        </p>
                      )}

                      {/* Linear badge - hidden for private items in public view */}
                      <div className="mt-2 flex items-center gap-1.5">
                        {!(isPrivate && !isAdmin) && (
                          <a
                            href={item.linear_issue_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:underline"
                          >
                            {isPrivate && (
                              <svg
                                className="w-3 h-3 text-[var(--color-text-muted)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            )}
                            {item.linear_issue_identifier}
                          </a>
                        )}
                        {item.notes.length > 0 && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            ({item.notes.length} note{item.notes.length !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>

                      {/* Delete button */}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemDelete(item.id);
                          }}
                          className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {showDropAfter && renderDropIndicator()}
                  </div>
                );
              })}

              {/* Drop indicator at end of empty column or when targeting end */}
              {dropTarget?.column === column.key &&
                dropTarget.index >= columnItems.length &&
                draggingId !== null &&
                columnItems.length > 0 &&
                !columnItems.some(
                  (_, idx) =>
                    dropTarget.index === idx + 1 && idx === columnItems.length - 1
                ) &&
                renderDropIndicator()}

              {columnItems.length === 0 && (
                <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
                  {isAdmin ? "Drop items here" : "No items"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
