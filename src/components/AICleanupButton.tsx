import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ai } from "../lib/api";
import { cn } from "../lib/utils";

interface AICleanupButtonProps {
  field: string;
  content: string;
  onCleanup: (cleaned: string) => void;
  disabled?: boolean;
}

export function AICleanupButton({ field, content, onCleanup, disabled }: AICleanupButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!content.trim() || loading || disabled) return;

    setLoading(true);
    try {
      const result = await ai.cleanup(field, content);
      onCleanup(result.cleaned);
    } catch (error) {
      console.error("AI cleanup failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled || !content.trim()}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors",
        "text-purple-600 hover:text-purple-700 hover:bg-purple-50",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      )}
      title="Clean up with AI"
    >
      <Sparkles className={cn("w-3.5 h-3.5", loading && "animate-pulse")} />
      {loading ? "Cleaning..." : "AI Cleanup"}
    </button>
  );
}
