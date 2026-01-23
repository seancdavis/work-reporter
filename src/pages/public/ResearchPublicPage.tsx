import { useState, useEffect } from "react";
import { research, type ResearchItem, type ResearchColumn } from "../../lib/api";

const COLUMNS: { id: ResearchColumn; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "exploring", label: "Exploring" },
  { id: "deep_dive", label: "Deep Dive" },
  { id: "synthesizing", label: "Synthesizing" },
  { id: "parked", label: "Parked" },
];

export function ResearchPublicPage() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch research items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const data = await research.list();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch research items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  const getColumnItems = (columnId: ResearchColumn) => {
    return items.filter((item) => item.column === columnId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Research Board</h1>
        <p className="text-gray-600 mt-1">
          What I'm actively researching and thinking about.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">
          No research items yet.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnItems = getColumnItems(column.id);
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-64 bg-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {column.label}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    {columnItems.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-md p-3 shadow-sm border border-gray-200"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-blue-600 text-sm">
                          {item.linear_issue_identifier}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {item.linear_issue_title}
                      </p>
                      {item.notes && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2 border-t border-gray-100 pt-2">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {columnItems.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No items
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
