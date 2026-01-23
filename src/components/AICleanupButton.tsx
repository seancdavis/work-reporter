import { useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!content.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);
    try {
      const result = await ai.cleanup(field, content);
      onCleanup(result.cleaned);
    } catch (err) {
      console.error("AI cleanup failed:", err);
      setError("AI cleanup failed");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </span>
    );
  }

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
