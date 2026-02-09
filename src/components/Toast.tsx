import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 150);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border transition-all duration-150",
        toast.type === "success"
          ? "bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success-text)]"
          : "bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger-text)]",
        isVisible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={handleDismiss}
        className={cn(
          "ml-2 p-1 rounded-full transition-colors flex-shrink-0",
          toast.type === "success"
            ? "hover:bg-[var(--color-success)]/20 text-[var(--color-success)]"
            : "hover:bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
