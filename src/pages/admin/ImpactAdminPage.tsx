import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { impact as impactApi, type ImpactItem } from "../../lib/api";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TextArea } from "../../components/TextArea";
import { ImpactModal } from "../../components/ImpactModal";
import { MarkdownContent } from "../../components/MarkdownContent";
import { formatDate, formatDateDisplay } from "../../lib/utils";

export function ImpactAdminPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<ImpactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ImpactItem | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shippedDate, setShippedDate] = useState(formatDate(new Date()));

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setShippedDate(formatDate(new Date()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !shippedDate) return;

    setSaving(true);
    try {
      const newItem = await impactApi.create({
        title: title.trim(),
        description: description || undefined,
        shipped_date: shippedDate,
      });

      setItems([newItem, ...items]);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create impact item:", error);
      alert("Failed to save impact item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await impactApi.delete(id);
      setItems(items.filter((i) => i.id !== id));
      setSelectedItem(null);
      navigate("/admin/impact", { replace: true });
    } catch (error) {
      console.error("Failed to delete impact item:", error);
    }
  };

  const handleOpenItem = (item: ImpactItem) => {
    setSelectedItem(item);
    navigate(`/admin/impact/${item.id}`);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    navigate("/admin/impact", { replace: true });
  };

  const handleUpdateItem = (updated: ImpactItem) => {
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Impact</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Track shipped work and its impact for promotion evidence.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Impact"}
        </Button>
      </div>

      {/* Add Impact Form */}
      {showForm && (
        <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            Record New Impact
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What did you ship?"
                required
              />
              <Input
                label="Shipped Date"
                type="date"
                value={shippedDate}
                onChange={(e) => setShippedDate(e.target.value)}
                required
              />
            </div>

            <TextArea
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the impact of this work (supports markdown)..."
              rows={3}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Impact List */}
      {loading ? (
        <p className="text-[var(--color-text-tertiary)]">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-tertiary)]">No impact items recorded yet.</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            Record Your First Impact
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenItem(item)}
              className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6 cursor-pointer hover:border-[var(--color-border-secondary)] transition-colors"
            >
              <div className="flex items-start justify-between">
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
          isAdmin={true}
          onClose={handleCloseModal}
          onUpdate={handleUpdateItem}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
