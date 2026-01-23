import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { research, linear, type ResearchItem, type ResearchColumn, type LinearIssue } from "../../lib/api";
import { KanbanBoard } from "../../components/KanbanBoard";
import { ResearchModal } from "../../components/ResearchModal";
import { Button } from "../../components/Button";
import { CardLoader } from "../../components/LoadingSpinner";
import { cn } from "../../lib/utils";

export function ResearchAdminPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LinearIssue[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null);

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

  // Open modal when itemId is in URL
  useEffect(() => {
    if (itemId && items.length > 0) {
      const item = items.find((i) => i.id === parseInt(itemId));
      if (item) {
        setSelectedItem(item);
      } else {
        // Item not found, navigate back to research page
        navigate("/admin/research", { replace: true });
      }
    } else if (!itemId) {
      setSelectedItem(null);
    }
  }, [itemId, items, navigate]);

  // Search Linear issues
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await linear.search(searchQuery);
        // Filter out issues already on the board
        const existingIds = new Set(items.map((i) => i.linear_issue_id));
        setSearchResults(results.filter((r) => !existingIds.has(r.id)));
      } catch (error) {
        console.error("Failed to search issues:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, items]);

  const handleAddIssue = async (issue: LinearIssue) => {
    setAdding(true);
    try {
      const newItem = await research.add(issue, "ideas");
      setItems([...items, newItem]);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add issue:", error);
      alert("Failed to add issue. It may already be on the board.");
    } finally {
      setAdding(false);
    }
  };

  const handleItemUpdate = async (
    id: number,
    data: { column?: ResearchColumn }
  ) => {
    try {
      const updated = await research.update(id, data);
      setItems(items.map((i) => (i.id === id ? updated : i)));
    } catch (error) {
      console.error("Failed to update item:", error);
      throw error;
    }
  };

  const handleItemClick = (item: ResearchItem) => {
    navigate(`/admin/research/${item.id}`);
  };

  const handleCloseModal = () => {
    navigate("/admin/research");
  };

  const handleModalUpdate = (updated: ResearchItem) => {
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  const handleItemDelete = async (id: number) => {
    if (!confirm("Remove this item from the research board?")) return;

    try {
      await research.delete(id);
      setItems(items.filter((i) => i.id !== id));
      // If viewing the deleted item, close modal
      if (selectedItem?.id === id) {
        navigate("/admin/research");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Research Board</h1>
          <p className="text-gray-600 mt-1">
            Track what you're actively researching and thinking about.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>Add Issue</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardLoader key={i} lines={4} />
          ))}
        </div>
      ) : (
        <KanbanBoard
          items={items}
          onItemsChange={setItems}
          onItemUpdate={handleItemUpdate}
          onItemClick={handleItemClick}
          onItemDelete={handleItemDelete}
          isAdmin={true}
        />
      )}

      {/* Add Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Add Issue to Research Board
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Linear issues by ID or title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />

              <div className="mt-4 max-h-80 overflow-auto">
                {searching ? (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((issue) => (
                      <button
                        key={issue.id}
                        onClick={() => handleAddIssue(issue)}
                        disabled={adding}
                        className={cn(
                          "w-full p-3 text-left rounded-md border border-gray-200 hover:bg-gray-50 transition-colors",
                          adding && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600">
                            {issue.identifier}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            issue.state.type === "started"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {issue.state.name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {issue.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {issue.team.name}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    No issues found
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    Start typing to search for issues
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Research Item Modal */}
      {selectedItem && (
        <ResearchModal
          item={selectedItem}
          isAdmin={true}
          onClose={handleCloseModal}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
}
