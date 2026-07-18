/**
 * Format a Date object to a local YYYY-MM-DD string without UTC shifting.
 */
export const getDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get the Monday of the week for a given Date, normalized to local midnight.
 */
export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (Sunday = 0, Monday = 1, etc.)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Count habit completion logs in the week starting on the given Monday.
 */
export const getCompletionsForWeek = (monday: Date, completedDates: Set<string>): number => {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (completedDates.has(getDateString(d))) {
      count++;
    }
  }
  return count;
};

/**
 * Calculate the streak of consecutive completed days for a habit.
 * Streak is defined as consecutive calendar days completed leading up to today (or yesterday).
 * @param completedDates Set of YYYY-MM-DD date strings when the habit was completed
 * @param referenceDate Optional date to calculate from (defaults to new Date())
 */
export const calculateHabitStreak = (
  completedDates: Set<string>,
  referenceDate: Date = new Date()
): number => {
  const today = new Date(referenceDate);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let streak = 0;
  let currentCheckedDate = new Date(today);

  if (completedDates.has(getDateString(today))) {
    streak = 1;
    currentCheckedDate = today;
  } else if (completedDates.has(getDateString(yesterday))) {
    streak = 1;
    currentCheckedDate = yesterday;
  } else {
    return 0;
  }

  while (true) {
    const nextDate = new Date(currentCheckedDate);
    nextDate.setDate(currentCheckedDate.getDate() - 1);
    if (completedDates.has(getDateString(nextDate))) {
      streak++;
      currentCheckedDate = nextDate;
    } else {
      break;
    }
  }
  return streak;
};

