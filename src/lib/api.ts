// API client for work-tracker

const API_BASE = "/.netlify/functions";

// Types
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: {
    name: string;
    type: string;
  };
  team: {
    name: string;
    key: string;
  };
  priority: number;
  priorityLabel: string;
}

export interface DailyStandup {
  id: number;
  date: string;
  yesterday_summary: string | null;
  today_plan: string | null;
  blockers: string | null;
  linked_issues: Array<{ id: string; identifier: string; title: string }>;
  created_at: string;
  updated_at: string;
}

export interface WeeklyStandup {
  id: number;
  week_start: string;
  planned_accomplishments: string | null;
  goals: string[];
  linked_issues: Array<{ id: string; identifier: string; title: string }>;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReport {
  id: number;
  week_start: string;
  ai_summary: string | null;
  highlights: string[];
  metrics: {
    issuesWorkedOn?: number;
    daysReported?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Kudo {
  id: number;
  received_date: string;
  sender_name: string;
  message: string;
  context: string | null;
  screenshot_blob_key: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthStatus {
  authenticated: boolean;
  type: "admin" | "kudos" | null;
}

// Helper function
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const auth = {
  status: () => fetchApi<AuthStatus>("/auth"),

  login: (password: string, type: "admin" | "kudos" = "admin") =>
    fetchApi<{ success: boolean; type: string }>("/auth", {
      method: "POST",
      body: JSON.stringify({ password, type }),
    }),

  logout: () =>
    fetchApi<{ success: boolean }>("/auth", {
      method: "DELETE",
    }),
};

// Daily Standups API
export const dailyStandups = {
  list: (options?: { date?: string; week?: string }) => {
    const params = new URLSearchParams();
    if (options?.date) params.set("date", options.date);
    if (options?.week) params.set("week", options.week);
    const query = params.toString();
    return fetchApi<DailyStandup[]>(`/daily-standups${query ? `?${query}` : ""}`);
  },

  save: (data: {
    date: string;
    yesterday_summary?: string;
    today_plan?: string;
    blockers?: string;
    linked_issues?: Array<{ id: string; identifier: string; title: string }>;
  }) =>
    fetchApi<DailyStandup>("/daily-standups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (date: string) =>
    fetchApi<{ success: boolean }>(`/daily-standups?date=${date}`, {
      method: "DELETE",
    }),
};

// Weekly Standups API
export const weeklyStandups = {
  list: (week?: string) => {
    const query = week ? `?week=${week}` : "";
    return fetchApi<WeeklyStandup[]>(`/weekly-standups${query}`);
  },

  save: (data: {
    week_start: string;
    planned_accomplishments?: string;
    goals?: string[];
    linked_issues?: Array<{ id: string; identifier: string; title: string }>;
  }) =>
    fetchApi<WeeklyStandup>("/weekly-standups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (week: string) =>
    fetchApi<{ success: boolean }>(`/weekly-standups?week=${week}`, {
      method: "DELETE",
    }),
};

// Weekly Reports API
export const weeklyReports = {
  list: (week?: string) => {
    const query = week ? `?week=${week}` : "";
    return fetchApi<WeeklyReport[]>(`/weekly-reports${query}`);
  },

  generate: (week_start: string) =>
    fetchApi<WeeklyReport>("/weekly-reports/generate", {
      method: "POST",
      body: JSON.stringify({ week_start }),
    }),

  save: (data: {
    week_start: string;
    ai_summary?: string;
    highlights?: string[];
    metrics?: Record<string, unknown>;
  }) =>
    fetchApi<WeeklyReport>("/weekly-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Kudos API
export const kudos = {
  list: (options?: { year?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.year) params.set("year", options.year.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    const query = params.toString();
    return fetchApi<Kudo[]>(`/kudos${query ? `?${query}` : ""}`);
  },

  create: async (data: {
    received_date: string;
    sender_name: string;
    message: string;
    context?: string;
    tags?: string[];
    screenshot?: File;
  }) => {
    if (data.screenshot) {
      const formData = new FormData();
      formData.append("received_date", data.received_date);
      formData.append("sender_name", data.sender_name);
      formData.append("message", data.message);
      if (data.context) formData.append("context", data.context);
      if (data.tags) formData.append("tags", JSON.stringify(data.tags));
      formData.append("screenshot", data.screenshot);

      const response = await fetch(`${API_BASE}/kudos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json() as Promise<Kudo>;
    }

    return fetchApi<Kudo>("/kudos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: Partial<Omit<Kudo, "id" | "created_at" | "updated_at" | "screenshot_blob_key">>) =>
    fetchApi<Kudo>(`/kudos?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/kudos?id=${id}`, {
      method: "DELETE",
    }),

  getScreenshotUrl: (key: string) => `${API_BASE}/screenshots?key=${encodeURIComponent(key)}`,
};

// Linear API
export const linear = {
  getActiveIssues: () => fetchApi<LinearIssue[]>("/linear"),

  search: (query: string) =>
    fetchApi<LinearIssue[]>(`/linear?search=${encodeURIComponent(query)}`),
};

// Database init
export const initDb = () => fetchApi<{ success: boolean; message: string }>("/init-db");
