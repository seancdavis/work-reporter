import { useRef, useEffect, useCallback } from "react";
import { cn } from "../lib/utils";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoExpand?: boolean;
}

export function TextArea({ label, error, className, autoExpand = true, ...props }: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !autoExpand) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set the height to scrollHeight to expand the textarea
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [autoExpand]);

  // Adjust height on mount and when value changes
  useEffect(() => {
    adjustHeight();
  }, [props.value, adjustHeight]);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        onInput={adjustHeight}
        className={cn(
          "w-full px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors",
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]",
          "disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed",
          "placeholder:text-[var(--color-text-muted)]",
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border-primary)]",
          autoExpand && "resize-none overflow-hidden",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
