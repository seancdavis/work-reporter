import { useState, useEffect, useCallback, useRef } from "react";

interface UseDraftStorageOptions {
  key: string;
  savedValue: string;
  debounceMs?: number;
}

export function useDraftStorage({
  key,
  savedValue,
  debounceMs = 1000,
}: UseDraftStorageOptions) {
  const [draftValue, setDraftValueState] = useState<string>(() => {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored : savedValue;
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize when key or savedValue changes (date/week navigation or data load)
  useEffect(() => {
    const stored = localStorage.getItem(key);
    setDraftValueState(stored !== null ? stored : savedValue);
  }, [key, savedValue]);

  const setDraftValue = useCallback(
    (value: string) => {
      setDraftValueState(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (value !== savedValue) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      }, debounceMs);
    },
    [key, savedValue, debounceMs]
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setDraftValueState(savedValue);
  }, [key, savedValue]);

  const hasDraft = draftValue !== savedValue;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { draftValue, setDraftValue, hasDraft, clearDraft };
}
