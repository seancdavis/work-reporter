import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { impact as impactApi, type ImpactItem } from "../../lib/api";
import { ImpactModal } from "../../components/ImpactModal";
import { MarkdownContent } from "../../components/MarkdownContent";
import { CardLoader } from "../../components/LoadingSpinner";
import { formatDateDisplay } from "../../lib/utils";

export function ImpactPublicPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<ImpactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ImpactItem | null>(null);

  // Fetch items
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const data = await impactApi.list();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch impact items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Handle URL-based modal opening
  useEffect(() => {
    if (itemId && items.length > 0) {
      const item = items.find((i) => i.id === parseInt(itemId));
      if (item) {
        setSelectedItem(item);
      }
    }
  }, [itemId, items]);

  const handleOpenItem = (item: ImpactItem) => {
    setSelectedItem(item);
    navigate(`/impact/${item.id}`);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    navigate("/impact", { replace: true });
  };

  const handleUpdateItem = (updated: ImpactItem) => {
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Impact</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          Shipped work and its impact.
        </p>
      </div>

      {/* Impact List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardLoader key={i} lines={3} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-tertiary)]">No impact items recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenItem(item)}
              className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6 cursor-pointer hover:border-[var(--color-border-secondary)] transition-colors"
            >
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                      {item.title}
                    </h3>
                    {item.linear_issue_identifier && (
                      <span className="flex-shrink-0 text-xs bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] px-2 py-0.5 rounded-md font-medium">
                        {item.linear_issue_identifier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-tertiary)] mb-2">
                    Shipped {formatDateDisplay(item.shipped_date)}
                  </p>
                  {item.description_html && (
                    <div className="line-clamp-2">
                      <MarkdownContent
                        html={item.description_html}
                        className="text-sm text-[var(--color-text-secondary)]"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
                    {item.notes.length > 0 && (
                      <span>{item.notes.length} note{item.notes.length !== 1 ? "s" : ""}</span>
                    )}
                    {(item.links || []).length > 0 && (
                      <span>{item.links.length} link{item.links.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impact Modal */}
      {selectedItem && (
        <ImpactModal
          item={selectedItem}
          isAdmin={false}
          onClose={handleCloseModal}
          onUpdate={handleUpdateItem}
        />
      )}
    </div>
  );
}
