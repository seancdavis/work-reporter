import { useState } from "react";
import { type ResearchItem, type ResearchColumn } from "../lib/api";
import { cn } from "../lib/utils";

interface KanbanBoardProps {
  items: ResearchItem[];
  onItemsChange: (items: ResearchItem[]) => void;
  onItemUpdate: (id: number, data: { column?: ResearchColumn; notes?: string }) => Promise<void>;
  onItemDelete: (id: number) => Promise<void>;
  isAdmin: boolean;
}

const COLUMNS: { key: ResearchColumn; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "bg-gray-100" },
  { key: "exploring", label: "Exploring", color: "bg-blue-50" },
  { key: "deep_dive", label: "Deep Dive", color: "bg-purple-50" },
  { key: "synthesizing", label: "Synthesizing", color: "bg-amber-50" },
  { key: "parked", label: "Parked", color: "bg-green-50" },
];

export function KanbanBoard({
  items,
  onItemsChange,
  onItemUpdate,
  onItemDelete,
  isAdmin,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const getColumnItems = (column: ResearchColumn) =>
    items
      .filter((item) => item.column === column)
      .sort((a, b) => a.display_order - b.display_order);

  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    if (!isAdmin) return;
    setDraggingId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: ResearchColumn) => {
    if (!isAdmin) return;
    e.preventDefault();

    const itemId = parseInt(e.dataTransfer.getData("text/plain"));
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Calculate new order (add to end of column)
    const columnItems = getColumnItems(targetColumn);
    const newOrder = columnItems.length > 0
      ? Math.max(...columnItems.map((i) => i.display_order)) + 1
      : 0;

    // Optimistically update UI
    const updatedItems = items.map((i) =>
      i.id === itemId ? { ...i, column: targetColumn, display_order: newOrder } : i
    );
    onItemsChange(updatedItems);

    // Persist to backend
    try {
      await onItemUpdate(itemId, { column: targetColumn });
    } catch (error) {
      // Revert on error
      onItemsChange(items);
    }

    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const startEditingNotes = (item: ResearchItem) => {
    setEditingNotes(item.id);
    setNotesValue(item.notes || "");
  };

  const saveNotes = async (itemId: number) => {
    await onItemUpdate(itemId, { notes: notesValue });
    setEditingNotes(null);
    setNotesValue("");
  };

  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNotesValue("");
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <div
          key={column.key}
          className={cn(
            "flex-shrink-0 w-72 rounded-lg p-3",
            column.color
          )}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.key)}
        >
          <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
            <span>{column.label}</span>
            <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded">
              {getColumnItems(column.key).length}
            </span>
          </h3>

          <div className="space-y-2 min-h-[200px]">
            {getColumnItems(column.key).map((item) => (
              <div
                key={item.id}
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "bg-white rounded-md p-3 shadow-sm border border-gray-200",
                  isAdmin && "cursor-grab active:cursor-grabbing",
                  draggingId === item.id && "opacity-50"
                )}
              >
                <a
                  href={item.linear_issue_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {item.linear_issue_identifier}
                </a>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {item.linear_issue_title}
                </p>

                {/* Notes section */}
                {editingNotes === item.id ? (
                  <div className="mt-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded resize-none"
                      rows={2}
                      placeholder="Add notes..."
                      autoFocus
                    />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => saveNotes(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditingNotes}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : item.notes ? (
                  <p
                    className={cn(
                      "text-xs text-gray-500 mt-2 italic",
                      isAdmin && "cursor-pointer hover:text-gray-700"
                    )}
                    onClick={() => isAdmin && startEditingNotes(item)}
                  >
                    {item.notes}
                  </p>
                ) : isAdmin ? (
                  <button
                    onClick={() => startEditingNotes(item)}
                    className="text-xs text-gray-400 mt-2 hover:text-gray-600"
                  >
                    + Add notes
                  </button>
                ) : null}

                {/* Delete button */}
                {isAdmin && (
                  <button
                    onClick={() => onItemDelete(item.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {getColumnItems(column.key).length === 0 && (
              <div className="text-sm text-gray-400 text-center py-8">
                {isAdmin ? "Drop items here" : "No items"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
