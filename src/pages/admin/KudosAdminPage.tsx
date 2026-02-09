import { useState, useEffect } from "react";
import { kudos as kudosApi, type Kudo } from "../../lib/api";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TextArea } from "../../components/TextArea";
import { formatDate, formatDateDisplay } from "../../lib/utils";

export function KudosAdminPage() {
  const [kudosList, setKudosList] = useState<Kudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [receivedDate, setReceivedDate] = useState(formatDate(new Date()));
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Fetch kudos
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const data = await kudosApi.list();
        setKudosList(data);
      } catch (error) {
        console.error("Failed to fetch kudos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const resetForm = () => {
    setReceivedDate(formatDate(new Date()));
    setSenderName("");
    setMessage("");
    setContext("");
    setTags([]);
    setNewTag("");
    setScreenshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;

    setSaving(true);
    try {
      const newKudo = await kudosApi.create({
        received_date: receivedDate,
        sender_name: senderName,
        message,
        context: context || undefined,
        tags,
        screenshot: screenshot || undefined,
      });

      setKudosList([newKudo, ...kudosList]);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create kudo:", error);
      alert("Failed to save kudo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this kudo?")) return;

    try {
      await kudosApi.delete(id);
      setKudosList(kudosList.filter((k) => k.id !== id));
    } catch (error) {
      console.error("Failed to delete kudo:", error);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Group kudos by year
  const kudosByYear = kudosList.reduce(
    (acc, kudo) => {
      const year = new Date(kudo.received_date + "T00:00:00").getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(kudo);
      return acc;
    },
    {} as Record<number, Kudo[]>
  );

  const years = Object.keys(kudosByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Kudos</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Manage recognition and positive feedback for promotion evidence.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Kudo"}
        </Button>
      </div>

      {/* Add Kudo Form */}
      {showForm && (
        <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            Record New Kudo
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date Received"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
              />
              <Input
                label="From (Sender Name)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Who gave this feedback?"
                required
              />
            </div>

            <TextArea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What did they say?"
              rows={3}
              required
            />

            <TextArea
              label="Context (optional)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context about this feedback..."
              rows={2}
            />

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                Tags
              </label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] text-sm rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                Screenshot (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="block w-full text-sm text-[var(--color-text-tertiary)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[var(--color-accent-secondary)] file:text-[var(--color-accent-text)] hover:file:bg-[var(--color-bg-hover)]"
              />
              {screenshot && (
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Selected: {screenshot.name}
                </p>
              )}
            </div>

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
                Save Kudo
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Kudos List */}
      {loading ? (
        <p className="text-[var(--color-text-tertiary)]">Loading...</p>
      ) : kudosList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-tertiary)]">No kudos recorded yet.</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            Add Your First Kudo
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">{year}</h2>
              <div className="space-y-4">
                {kudosByYear[year].map((kudo) => (
                  <div
                    key={kudo.id}
                    className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {kudo.sender_name}
                          </span>
                          <span className="text-sm text-[var(--color-text-tertiary)]">
                            {formatDateDisplay(kudo.received_date)}
                          </span>
                        </div>
                        <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                          {kudo.message}
                        </p>
                        {kudo.context && (
                          <p className="mt-2 text-sm text-[var(--color-text-tertiary)] italic">
                            Context: {kudo.context}
                          </p>
                        )}
                        {kudo.tags && kudo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {kudo.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {kudo.screenshot_blob_key && (
                          <div className="mt-4">
                            <img
                              src={kudosApi.getScreenshotUrl(kudo.screenshot_blob_key)}
                              alt="Screenshot"
                              className="max-w-md rounded-lg border border-[var(--color-border-primary)]"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(kudo.id)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
