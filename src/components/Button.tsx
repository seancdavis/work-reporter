import { cn } from "../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        // Primary variant
        variant === "primary" &&
          "bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-primary-hover)] focus:ring-[var(--color-accent-primary)]",
        // Secondary variant
        variant === "secondary" &&
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] focus:ring-[var(--color-accent-primary)]",
        // Danger variant
        variant === "danger" &&
          "bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:bg-[var(--color-danger-hover)] focus:ring-[var(--color-danger)]",
        // Ghost variant
        variant === "ghost" &&
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:ring-[var(--color-border-secondary)]",
        // Sizes
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        // Focus ring offset color for dark mode support
        "focus:ring-offset-[var(--color-bg-primary)]",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
