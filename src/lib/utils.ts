// Date utilities

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekdayDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  // If Saturday (6), go back 1 day to Friday
  // If Sunday (0), go back 2 days to Friday
  if (day === 6) {
    d.setDate(d.getDate() - 1);
  } else if (day === 0) {
    d.setDate(d.getDate() - 2);
  }
  return d;
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateCompact(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }

  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
}

export function getRelativeWeekLabel(weekStart: Date): string {
  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const diff = Math.round(
    (currentWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  if (diff === 0) return "This Week";
  if (diff === 1) return "Last Week";
  if (diff === -1) return "Next Week";
  if (diff > 0) return `${diff} weeks ago`;
  return `In ${Math.abs(diff)} weeks`;
}

export function getWeekdayRange(dateInWeek: string): string {
  const date = new Date(dateInWeek + "T00:00:00");
  const monday = getWeekStart(date);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  const startMonth = monday.toLocaleDateString("en-US", { month: "short" });
  const endMonth = friday.toLocaleDateString("en-US", { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${monday.getDate()}-${friday.getDate()}`;
  }
  return `${startMonth} ${monday.getDate()} - ${endMonth} ${friday.getDate()}`;
}

export function groupDatesByWeek(dates: string[]): Array<{ weekLabel: string; weekKey: string; dates: string[] }> {
  const groups = new Map<string, string[]>();

  for (const dateStr of dates) {
    const date = new Date(dateStr + "T00:00:00");
    const weekKey = formatDate(getWeekStart(date));
    if (!groups.has(weekKey)) {
      groups.set(weekKey, []);
    }
    groups.get(weekKey)!.push(dateStr);
  }

  return Array.from(groups.entries()).map(([weekKey, weekDates]) => ({
    weekLabel: getWeekdayRange(weekDates[0]),
    weekKey,
    dates: weekDates,
  }));
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
