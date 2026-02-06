import { useState, useCallback, createContext, useContext } from "react";

interface GlobalLoadingContextValue {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

export const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

export function useGlobalLoadingProvider() {
  const [activeRequests, setActiveRequests] = useState(0);
  const isLoading = activeRequests > 0;

  const startLoading = useCallback(() => {
    setActiveRequests((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setActiveRequests((prev) => Math.max(0, prev - 1));
  }, []);

  return { isLoading, startLoading, stopLoading };
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return context;
}
