import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { research, type ResearchItem, type ResearchColumn } from "../../lib/api";
import { KanbanBoard } from "../../components/KanbanBoard";
import { ResearchModal } from "../../components/ResearchModal";
import { CardLoader } from "../../components/LoadingSpinner";

export function ResearchPublicPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<ResearchItem[]>([]);
  const [allItems, setAllItems] = useState<ResearchItem[]>([]); // Includes private items for direct URL access
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null);

  // Fetch research items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const data = await research.list();
        setAllItems(data);
        // Filter out SCD- items for public board display
        setItems(data.filter((item) => !item.linear_issue_identifier.startsWith("SCD-")));
      } catch (error) {
        console.error("Failed to fetch research items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  // Open modal when itemId is in URL (allows direct link to private items)
  useEffect(() => {
    if (itemId && allItems.length > 0) {
      const item = allItems.find((i) => i.id === parseInt(itemId));
      if (item) {
        setSelectedItem(item);
      } else {
        // Item not found, navigate back to research page
        navigate("/research", { replace: true });
      }
    } else if (!itemId) {
      setSelectedItem(null);
    }
  }, [itemId, allItems, navigate]);

  const handleItemClick = (item: ResearchItem) => {
    navigate(`/research/${item.id}`);
  };

  const handleCloseModal = () => {
    navigate("/research");
  };

  const handleItemUpdate = async (
    _id: number,
    _data: { column?: ResearchColumn }
  ) => {
    // No-op for public view
  };

  const handleItemDelete = async (_id: number) => {
    // No-op for public view
  };

  // Check if selected item is private (SCD-) - hide Linear badge if so
  const isSelectedItemPrivate = selectedItem?.linear_issue_identifier.startsWith("SCD-");

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Research Board</h1>
        <p className="text-gray-600 mt-1">
          What Sean is actively researching and thinking about.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardLoader key={i} lines={4} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">
          No research items yet.
        </div>
      ) : (
        <KanbanBoard
          items={items}
          onItemsChange={() => {}} // No-op for public view
          onItemUpdate={handleItemUpdate}
          onItemClick={handleItemClick}
          onItemDelete={handleItemDelete}
          isAdmin={false}
        />
      )}

      {/* Research Item Modal */}
      {selectedItem && (
        <ResearchModal
          item={selectedItem}
          isAdmin={false}
          hideLinearBadge={isSelectedItemPrivate}
          onClose={handleCloseModal}
          onUpdate={() => {}} // No-op for public view
        />
      )}
    </div>
  );
}
