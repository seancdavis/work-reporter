import { cn } from "../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors",
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)]",
          "disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed",
          "placeholder:text-[var(--color-text-muted)]",
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border-primary)]",
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
