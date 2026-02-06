import { useGlobalLoading } from "../hooks/useGlobalLoading";

export function GlobalLoadingBar() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden">
      <div className="h-full bg-[var(--color-accent-primary)] animate-loading-bar" />
    </div>
  );
}
