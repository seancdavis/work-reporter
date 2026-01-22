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
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        onInput={adjustHeight}
        className={cn(
          "w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500",
          error ? "border-red-300" : "border-gray-300",
          autoExpand && "resize-none overflow-hidden",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
