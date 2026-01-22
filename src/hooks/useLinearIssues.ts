import { useState, useEffect, useCallback } from "react";
import { linear, type LinearIssue } from "../lib/api";

export function useLinearIssues() {
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await linear.getActiveIssues();
      setIssues(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchIssues = useCallback(async (query: string) => {
    if (!query.trim()) {
      return fetchIssues();
    }

    setLoading(true);
    setError(null);
    try {
      const result = await linear.search(query);
      setIssues(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search issues");
    } finally {
      setLoading(false);
    }
  }, [fetchIssues]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, loading, error, refresh: fetchIssues, search: searchIssues };
}
