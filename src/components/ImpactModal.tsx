import { useState, useEffect, useRef } from "react";
import { type ImpactItem, type LinearIssue, impact, linear } from "../lib/api";
import { cn, timeAgo } from "../lib/utils";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "./Button";

interface ImpactModalProps {
  item: ImpactItem;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: (updated: ImpactItem) => void;
  onDelete?: (id: number) => void;
}

export function ImpactModal({
  item,
  isAdmin,
  onClose,
  onUpdate,
  onDelete,
}: ImpactModalProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);
  const [descriptionValue, setDescriptionValue] = useState(item.description || "");
  const [addingNote, setAddingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrlValue, setLinkUrlValue] = useState("");
  const [linkLabelValue, setLinkLabelValue] = useState("");
  const [showIssueSearch, setShowIssueSearch] = useState(false);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueResults, setIssueResults] = useState<LinearIssue[]>([]);
  const [searchingIssue, setSearchingIssue] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [editingDescription]);

  useEffect(() => {
    if (addingNote && noteTextareaRef.current) {
      noteTextareaRef.current.focus();
    }
  }, [addingNote]);

  // Search for Linear issue
  useEffect(() => {
    if (!issueSearch.trim()) {
      setIssueResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingIssue(true);
      try {
        const results = await linear.search(issueSearch);
        setIssueResults(results);
      } catch (error) {
        console.error("Failed to search issues:", error);
      } finally {
        setSearchingIssue(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [issueSearch]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle || editingDescription || addingNote || editingNoteId || showIssueSearch || addingLink) {
          setEditingTitle(false);
          setEditingDescription(false);
          setAddingNote(false);
          setEditingNoteId(null);
          setShowIssueSearch(false);
          setAddingLink(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, editingTitle, editingDescription, addingNote, editingNoteId, showIssueSearch, addingLink]);

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    setSaving(true);
    try {
      const updated = await impact.update(item.id, { title: titleValue.trim() });
      onUpdate(updated);
      setEditingTitle(false);
    } catch (error) {
      console.error("Failed to save title:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      const updated = await impact.update(item.id, { description: descriptionValue });
      onUpdate(updated);
      setEditingDescription(false);
    } catch (error) {
      console.error("Failed to save description:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteValue.trim()) return;
    setSaving(true);
    try {
      const newNote = await impact.addNote(item.id, noteValue.trim());
      onUpdate({
        ...item,
        notes: [...item.notes, newNote],
      });
      setNoteValue("");
      setAddingNote(false);
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditNote = (note: { id: number; content: string }) => {
    setEditingNoteId(note.id);
    setEditingNoteValue(note.content);
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editingNoteValue.trim()) return;
    setSaving(true);
    try {
      const updatedNote = await impact.updateNote(item.id, editingNoteId, editingNoteValue.trim());
      onUpdate({
        ...item,
        notes: item.notes.map((n) => (n.id === editingNoteId ? updatedNote : n)),
      });
      setEditingNoteId(null);
      setEditingNoteValue("");
    } catch (error) {
      console.error("Failed to edit note:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Delete this note?")) return;
    try {
      await impact.deleteNote(item.id, noteId);
      onUpdate({
        ...item,
        notes: item.notes.filter((n) => n.id !== noteId),
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleSetLinearIssue = async (issue: LinearIssue) => {
    setSaving(true);
    try {
      const updated = await impact.update(item.id, {
        linear_issue_id: issue.id,
        linear_issue_identifier: issue.identifier,
        linear_issue_title: issue.title,
        linear_issue_url: issue.url,
      });
      onUpdate(updated);
      setShowIssueSearch(false);
      setIssueSearch("");
    } catch (error) {
      console.error("Failed to set linked issue:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearLinearIssue = async () => {
    setSaving(true);
    try {
      const updated = await impact.update(item.id, {
        linear_issue_id: null,
        linear_issue_identifier: null,
        linear_issue_title: null,
        linear_issue_url: null,
      });
      onUpdate(updated);
    } catch (error) {
      console.error("Failed to clear linked issue:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrlValue.trim() || !linkLabelValue.trim()) return;
    setSaving(true);
    try {
      const newLink = await impact.addLink(item.id, linkUrlValue.trim(), linkLabelValue.trim());
      onUpdate({
        ...item,
        links: [...(item.links || []), newLink],
      });
      setLinkUrlValue("");
      setLinkLabelValue("");
      setAddingLink(false);
    } catch (error) {
      console.error("Failed to add link:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm("Remove this link?")) return;
    try {
      await impact.deleteLink(item.id, linkId);
      onUpdate({
        ...item,
        links: (item.links || []).filter((l) => l.id !== linkId),
      });
    } catch (error) {
      console.error("Failed to delete link:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this impact item?")) return;
    onDelete?.(item.id);
  };

  const handleSyncFromLinear = async () => {
    setSyncing(true);
    try {
      const updated = await impact.syncFromLinear(item.id);
      onUpdate(updated);
    } catch (error) {
      console.error("Failed to sync from Linear:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Sort notes reverse chronological (newest first)
  const sortedNotes = [...item.notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
        <div
          className="relative w-full max-w-3xl bg-[var(--color-bg-elevated)] rounded-lg shadow-[var(--shadow-lg)] my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-primary)] px-6 py-4 rounded-t-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editingTitle && isAdmin ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") {
                          setTitleValue(item.title);
                          setEditingTitle(false);
                        }
                      }}
                      className="flex-1 text-xl font-semibold text-[var(--color-text-primary)] px-2 py-1 border border-[var(--color-border-primary)] rounded-md bg-[var(--color-bg-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                    />
                    <Button size="sm" onClick={handleSaveTitle} loading={saving}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTitleValue(item.title);
                        setEditingTitle(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <h2
                    className={cn(
                      "text-xl font-semibold text-[var(--color-text-primary)]",
                      isAdmin && "cursor-pointer hover:text-[var(--color-accent-primary)]"
                    )}
                    onClick={() => isAdmin && setEditingTitle(true)}
                  >
                    {item.title}
                  </h2>
                )}

                {/* Shipped date and Linear issue badge */}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-tertiary)]">
                    Shipped {new Date(item.shipped_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {item.linear_issue_id && (
                    <div className="flex items-center gap-1">
                      <a
                        href={item.linear_issue_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] text-sm rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
                      >
                        <span className="font-medium">{item.linear_issue_identifier}</span>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      {isAdmin && (
                        <button
                          onClick={handleSyncFromLinear}
                          disabled={syncing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors disabled:opacity-50"
                          title="Re-sync from Linear (updates identifier, title, and URL)"
                        >
                          <svg
                            className={cn("w-3.5 h-3.5", syncing && "animate-spin")}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          {syncing ? "Syncing..." : "Sync"}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={handleClearLinearIssue}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                          title="Remove linked issue"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && onDelete && (
                  <button
                    onClick={handleDelete}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                    title="Delete impact item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Linear Issue Link */}
            {isAdmin && !item.linear_issue_id && (
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Linked Issue</h3>
                {showIssueSearch ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                      placeholder="Search for a Linear issue..."
                      className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                      autoFocus
                    />
                    {searchingIssue ? (
                      <div className="text-sm text-[var(--color-text-tertiary)] py-2">Searching...</div>
                    ) : issueResults.length > 0 ? (
                      <div className="border border-[var(--color-border-primary)] rounded-md max-h-48 overflow-auto">
                        {issueResults.map((issue) => (
                          <button
                            key={issue.id}
                            onClick={() => handleSetLinearIssue(issue)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border-primary)] last:border-b-0"
                          >
                            <span className="font-medium text-[var(--color-accent-primary)]">{issue.identifier}</span>
                            <span className="ml-2 text-[var(--color-text-secondary)]">{issue.title}</span>
                          </button>
                        ))}
                      </div>
                    ) : issueSearch.trim() ? (
                      <div className="text-sm text-[var(--color-text-tertiary)] py-2">No issues found</div>
                    ) : null}
                    <button
                      onClick={() => {
                        setShowIssueSearch(false);
                        setIssueSearch("");
                      }}
                      className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowIssueSearch(true)}
                    className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                  >
                    + Link a Linear issue
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Description</h3>

              {editingDescription && isAdmin ? (
                <div className="space-y-2">
                  <textarea
                    ref={descriptionTextareaRef}
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] resize-none"
                    placeholder="Describe the impact of this work (supports markdown)..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription} loading={saving}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDescriptionValue(item.description || "");
                        setEditingDescription(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : item.description_html ? (
                <div
                  className={cn(isAdmin && "cursor-pointer hover:bg-[var(--color-bg-hover)] rounded-md p-1 -m-1 transition-colors")}
                  onClick={() => isAdmin && setEditingDescription(true)}
                >
                  <MarkdownContent
                    html={item.description_html}
                    className="text-sm text-[var(--color-text-secondary)]"
                  />
                </div>
              ) : (
                <p
                  className={cn(
                    "text-sm text-[var(--color-text-muted)] italic",
                    isAdmin && "cursor-pointer hover:text-[var(--color-accent-primary)]"
                  )}
                  onClick={() => isAdmin && setEditingDescription(true)}
                >
                  {isAdmin ? "Click to add a description" : "No description"}
                </p>
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Links ({(item.links || []).length})
                </h3>
                {isAdmin && !addingLink && (
                  <button
                    onClick={() => setAddingLink(true)}
                    className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                  >
                    + Add Link
                  </button>
                )}
              </div>

              {/* Add link form */}
              {addingLink && isAdmin && (
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    value={linkLabelValue}
                    onChange={(e) => setLinkLabelValue(e.target.value)}
                    placeholder="Link label (e.g., PR, Blog post, Demo)"
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                    autoFocus
                  />
                  <input
                    type="url"
                    value={linkUrlValue}
                    onChange={(e) => setLinkUrlValue(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddLink} loading={saving}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLinkUrlValue("");
                        setLinkLabelValue("");
                        setAddingLink(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Links list */}
              {(item.links || []).length > 0 ? (
                <div className="space-y-1">
                  {(item.links || []).map((link) => (
                    <div key={link.id} className="flex items-center gap-2 group">
                      <svg className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:underline truncate"
                      >
                        {link.label}
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Remove link"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  {isAdmin ? "Click Add Link to attach relevant URLs" : "No links"}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Notes ({item.notes.length})
                </h3>
                {isAdmin && !addingNote && (
                  <button
                    onClick={() => setAddingNote(true)}
                    className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                  >
                    + Add Note
                  </button>
                )}
              </div>

              {/* Add note form */}
              {addingNote && isAdmin && (
                <div className="mb-4 space-y-2">
                  <textarea
                    ref={noteTextareaRef}
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] resize-none"
                    placeholder="Add a note (supports markdown)..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddNote} loading={saving}>
                      Add Note
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNoteValue("");
                        setAddingNote(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes list */}
              {sortedNotes.length > 0 ? (
                <div className="space-y-3">
                  {sortedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-[var(--color-bg-tertiary)] rounded-md p-3 relative group"
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNoteValue}
                            onChange={(e) => setEditingNoteValue(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEditNote} loading={saving}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteValue("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              {timeAgo(note.created_at)}
                              {note.updated_at && note.updated_at !== note.created_at && (
                                <span className="ml-1 italic">(edited)</span>
                              )}
                            </span>
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartEditNote(note)}
                                  className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)]"
                                  title="Edit note"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                                  title="Delete note"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {note.content_html ? (
                            <MarkdownContent
                              html={note.content_html}
                              className="text-sm text-[var(--color-text-secondary)]"
                            />
                          ) : (
                            <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                              {note.content}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  {isAdmin ? "Click Add Note to record impact details" : "No notes yet"}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-primary)] px-6 py-3 bg-[var(--color-bg-tertiary)] rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
              <span>Created {timeAgo(item.created_at)}</span>
              <span>Updated {timeAgo(item.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
