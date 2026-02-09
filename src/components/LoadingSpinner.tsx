import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-[var(--color-accent-primary)]", sizeMap[size])} />
      {label && <span className="text-[var(--color-text-tertiary)] text-sm">{label}</span>}
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--color-border-primary)]" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent animate-spin" />
        </div>
        <p className="text-[var(--color-text-tertiary)] text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

interface ContentLoaderProps {
  message?: string;
  className?: string;
}

export function ContentLoader({ message = "Loading...", className }: ContentLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-3 border-[var(--color-border-primary)]" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-3 border-[var(--color-accent-primary)] border-t-transparent animate-spin" />
        </div>
        <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
      </div>
    </div>
  );
}

interface CardLoaderProps {
  lines?: number;
}

export function CardLoader({ lines = 3 }: CardLoaderProps) {
  return (
    <div className="bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] p-6 animate-pulse">
      <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-1/3 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-[var(--color-bg-hover)] rounded"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
