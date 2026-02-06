import { useState, useEffect, useRef } from "react";
import { type ResearchItem, type LinearIssue, research, linear } from "../lib/api";
import { cn, timeAgo } from "../lib/utils";
import { MarkdownContent } from "./MarkdownContent";
import { Button } from "./Button";

interface ResearchModalProps {
  item: ResearchItem;
  isAdmin: boolean;
  hideLinearBadge?: boolean;
  onClose: () => void;
  onUpdate: (updated: ResearchItem) => void;
}

export function ResearchModal({
  item,
  isAdmin,
  hideLinearBadge,
  onClose,
  onUpdate,
}: ResearchModalProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);
  const [descriptionValue, setDescriptionValue] = useState(item.description || "");
  const [addingNote, setAddingNote] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [addingDocument, setAddingDocument] = useState(false);
  const [docUrlValue, setDocUrlValue] = useState("");
  const [docTitleValue, setDocTitleValue] = useState("");
  const [showPlannedIssueSearch, setShowPlannedIssueSearch] = useState(false);
  const [plannedIssueSearch, setPlannedIssueSearch] = useState("");
  const [plannedIssueResults, setPlannedIssueResults] = useState<LinearIssue[]>([]);
  const [searchingPlannedIssue, setSearchingPlannedIssue] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isPrivate = item.linear_issue_identifier.startsWith("SCD-");
  const showPlannedIssueSection = item.column === "discussing";

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

  // Search for planned issue
  useEffect(() => {
    if (!plannedIssueSearch.trim()) {
      setPlannedIssueResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlannedIssue(true);
      try {
        const results = await linear.search(plannedIssueSearch);
        setPlannedIssueResults(results);
      } catch (error) {
        console.error("Failed to search issues:", error);
      } finally {
        setSearchingPlannedIssue(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [plannedIssueSearch]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle || editingDescription || addingNote || editingNoteId || showPlannedIssueSearch) {
          setEditingTitle(false);
          setEditingDescription(false);
          setAddingNote(false);
          setEditingNoteId(null);
          setShowPlannedIssueSearch(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, editingTitle, editingDescription, addingNote, editingNoteId, showPlannedIssueSearch]);

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    setSaving(true);
    try {
      const updated = await research.update(item.id, { title: titleValue.trim() });
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
      const updated = await research.update(item.id, { description: descriptionValue });
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
      const newNote = await research.addNote(item.id, noteValue.trim());
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
      const updatedNote = await research.updateNote(item.id, editingNoteId, editingNoteValue.trim());
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
      await research.deleteNote(item.id, noteId);
      onUpdate({
        ...item,
        notes: item.notes.filter((n) => n.id !== noteId),
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleSetPlannedIssue = async (issue: LinearIssue) => {
    setSaving(true);
    try {
      const updated = await research.update(item.id, {
        planned_issue_id: issue.id,
        planned_issue_identifier: issue.identifier,
        planned_issue_title: issue.title,
        planned_issue_url: issue.url,
      });
      onUpdate(updated);
      setShowPlannedIssueSearch(false);
      setPlannedIssueSearch("");
    } catch (error) {
      console.error("Failed to set planned issue:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearPlannedIssue = async () => {
    setSaving(true);
    try {
      const updated = await research.update(item.id, {
        planned_issue_id: null,
        planned_issue_identifier: null,
        planned_issue_title: null,
        planned_issue_url: null,
      });
      onUpdate(updated);
    } catch (error) {
      console.error("Failed to clear planned issue:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocument = async () => {
    if (!docUrlValue.trim() || !docTitleValue.trim()) return;
    setSaving(true);
    try {
      const newDoc = await research.addDocument(item.id, docUrlValue.trim(), docTitleValue.trim());
      onUpdate({
        ...item,
        documents: [...(item.documents || []), newDoc],
      });
      setDocUrlValue("");
      setDocTitleValue("");
      setAddingDocument(false);
    } catch (error) {
      console.error("Failed to add document:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Remove this document?")) return;
    try {
      await research.deleteDocument(item.id, documentId);
      onUpdate({
        ...item,
        documents: (item.documents || []).filter((d) => d.id !== documentId),
      });
    } catch (error) {
      console.error("Failed to delete document:", error);
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

                {/* Linear badge */}
                {!hideLinearBadge && (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={item.linear_issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent-secondary)] text-[var(--color-accent-text)] text-sm rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      {isPrivate && (
                        <svg
                          className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]"
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
                    {item.linear_issue_title !== item.title && (
                      <span className="text-sm text-[var(--color-text-tertiary)] truncate">
                        (Linear: {item.linear_issue_title})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Description</h3>
                {isAdmin && !editingDescription && (
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingDescription && isAdmin ? (
                <div className="space-y-2">
                  <textarea
                    ref={descriptionTextareaRef}
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] resize-none"
                    placeholder="Add a description (supports markdown)..."
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
                <MarkdownContent
                  html={item.description_html}
                  className="text-sm text-[var(--color-text-secondary)]"
                />
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  {isAdmin ? "Click Edit to add a description" : "No description"}
                </p>
              )}
            </div>

            {/* Planned Issue Section */}
            {showPlannedIssueSection && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Linked Implementation
                  </h3>
                </div>

                {item.planned_issue_id ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={item.planned_issue_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--color-success-bg)] text-[var(--color-success-text)] text-sm rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <span className="font-medium">{item.planned_issue_identifier}</span>
                      <span className="text-[var(--color-success)]">{item.planned_issue_title}</span>
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
                        onClick={handleClearPlannedIssue}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                        title="Remove linked issue"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : isAdmin ? (
                  <div className="relative">
                    {showPlannedIssueSearch ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={plannedIssueSearch}
                          onChange={(e) => setPlannedIssueSearch(e.target.value)}
                          placeholder="Search for implementation issue..."
                          className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                          autoFocus
                        />
                        {searchingPlannedIssue ? (
                          <div className="text-sm text-[var(--color-text-tertiary)] py-2">Searching...</div>
                        ) : plannedIssueResults.length > 0 ? (
                          <div className="border border-[var(--color-border-primary)] rounded-md max-h-48 overflow-auto">
                            {plannedIssueResults.map((issue) => (
                              <button
                                key={issue.id}
                                onClick={() => handleSetPlannedIssue(issue)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border-primary)] last:border-b-0"
                              >
                                <span className="font-medium text-[var(--color-accent-primary)]">
                                  {issue.identifier}
                                </span>
                                <span className="ml-2 text-[var(--color-text-secondary)]">{issue.title}</span>
                              </button>
                            ))}
                          </div>
                        ) : plannedIssueSearch.trim() ? (
                          <div className="text-sm text-[var(--color-text-tertiary)] py-2">No issues found</div>
                        ) : null}
                        <button
                          onClick={() => {
                            setShowPlannedIssueSearch(false);
                            setPlannedIssueSearch("");
                          }}
                          className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPlannedIssueSearch(true)}
                        className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                      >
                        + Link implementation issue
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] italic">No implementation linked</p>
                )}
              </div>
            )}

            {/* Documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Documents ({(item.documents || []).length})
                </h3>
                {isAdmin && !addingDocument && (
                  <button
                    onClick={() => setAddingDocument(true)}
                    className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)]"
                  >
                    + Add Document
                  </button>
                )}
              </div>

              {/* Add document form */}
              {addingDocument && isAdmin && (
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    value={docTitleValue}
                    onChange={(e) => setDocTitleValue(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                    autoFocus
                  />
                  <input
                    type="url"
                    value={docUrlValue}
                    onChange={(e) => setDocUrlValue(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-[var(--color-border-primary)] rounded-md text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddDocument} loading={saving}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocUrlValue("");
                        setDocTitleValue("");
                        setAddingDocument(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Documents list */}
              {(item.documents || []).length > 0 ? (
                <div className="space-y-1">
                  {(item.documents || []).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 group"
                    >
                      <svg className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:underline truncate"
                      >
                        {doc.title}
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Remove document"
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
                  {isAdmin ? "Click Add Document to link relevant resources" : "No documents"}
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
                  {isAdmin ? "Click Add Note to start tracking your research" : "No notes yet"}
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
