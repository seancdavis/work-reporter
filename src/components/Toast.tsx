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
  const [dismissing, setDismissing] = useState<Set<number>>(new Set());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setDismissing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const startDismiss = useCallback((id: number) => {
    setDismissing((prev) => new Set(prev).add(id));
    setTimeout(() => removeToast(id), 300);
  }, [removeToast]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => startDismiss(id), 6000);
  }, [startDismiss]);

  return { toasts, showToast, dismissToast: startDismiss, dismissing };
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  dismissing?: Set<number>;
}

export function ToastContainer({ toasts, onDismiss, dismissing = new Set() }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} isDismissing={dismissing.has(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
  isDismissing: boolean;
}

function ToastItem({ toast, onDismiss, isDismissing }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  const shouldShow = isVisible && !isDismissing;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border",
        "transition-all duration-300 ease-out",
        toast.type === "success"
          ? "bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success-text)]"
          : "bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger-text)]",
        shouldShow
          ? "opacity-100 translate-y-0 translate-x-0 scale-100"
          : "opacity-0 translate-y-2 translate-x-4 scale-95"
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
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
