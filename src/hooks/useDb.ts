import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getDateString, calculateHabitStreak } from '../utils/date';


// 1. Projects
export function useProjects() {
  return useLiveQuery(() => db.projects.toArray()) || [];
}

export function useProject(id: number) {
  return useLiveQuery(() => db.projects.get(id), [id]);
}

// 2. Tasks
export function useTasks(projectId?: number | null) {
  return useLiveQuery(() => {
    if (projectId === undefined) {
      return db.tasks.toArray();
    }
    if (projectId === null) {
      return db.tasks.filter(t => t.projectId === null || t.projectId === undefined).toArray();
    }
    return db.tasks.where('projectId').equals(projectId).toArray();
  }, [projectId]) || [];
}

// 3. Time Entries
export function useRunningTimeEntries() {
  return useLiveQuery(async () => {
    const all = await db.timeEntries.toArray();
    return all.filter(e => e.endedAt === null || e.endedAt === undefined);
  }) || [];
}

export function useTimeEntriesForProject(projectId: number, sinceDate?: Date) {
  const sinceTime = sinceDate?.getTime();
  return useLiveQuery(async () => {
    const entries = await db.timeEntries.where('projectId').equals(projectId).toArray();
    if (sinceTime !== undefined) {
      return entries.filter(e => e.startedAt >= sinceTime);
    }
    return entries;
  }, [projectId, sinceTime]) || [];
}

// 4. Weekly Time Aggregated by Project (Last 7 Days) for Recharts
export function useWeeklyTimeByProject() {
  return useLiveQuery(async () => {
    const projects = await db.projects.toArray();
    const entries = await db.timeEntries.toArray();

    const days: { start: number; end: number; obj: Record<string, any> }[] = [];
    const now = new Date();

    // Generate last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayObj: Record<string, any> = { day: dayLabel };

      // Initialize all projects to 0 hours
      projects.forEach(p => {
        dayObj[p.name] = 0;
      });

      days.push({
        start: start.getTime(),
        end: end.getTime(),
        obj: dayObj,
      });
    }

    // Process time entries and allocate hours to starting day
    entries.forEach(entry => {
      const endedAt = entry.endedAt ?? (entry.pausedAt ?? Date.now());
      const durationHrs = (endedAt - entry.startedAt) / (1000 * 60 * 60);
      const project = projects.find(p => p.id === entry.projectId);

      if (project && durationHrs > 0) {
        const matchedDay = days.find(day => entry.startedAt >= day.start && entry.startedAt <= day.end);
        if (matchedDay) {
          const currentHours = matchedDay.obj[project.name] || 0;
          matchedDay.obj[project.name] = parseFloat((currentHours + durationHrs).toFixed(2));
        }
      }
    });

    return days.map(d => d.obj);
  }) || [];
}

// 5. Notes
export function useNotes() {
  return useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) || [];
}

export function useNote(id: number) {
  return useLiveQuery(() => db.notes.get(id), [id]);
}

// 6. Ideas
export function useIdeas() {
  return useLiveQuery(() => db.ideas.orderBy('createdAt').reverse().toArray()) || [];
}

// 7. Habits & Logs
export function useHabits() {
  return useLiveQuery(async () => {
    const all = await db.habits.toArray();
    return all.filter(h => h.archivedAt === null || h.archivedAt === undefined);
  }) || [];
}

export function useHabitLogs(habitId: number, daysBack: number) {
  return useLiveQuery(async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffStr = getDateString(cutoff);

    const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();
    return logs.filter(l => l.date >= cutoffStr);
  }, [habitId, daysBack]) || [];
}

// 8. Habit Streak Logic (Rolling 7-day window pace checking)
export function useHabitStreak(habitId: number) {
  return useLiveQuery(async () => {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;

    const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();
    const completedDates = new Set(logs.map(l => l.date));

    return calculateHabitStreak(completedDates);
  }, [habitId]) ?? 0;
}

// 9. Settings Singleton
export function useSettings() {
  return useLiveQuery(() => db.settings.get(1));
}

// 10. Overlapping Interval Merging Helpers
export interface Interval {
  start: number;
  end: number;
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  // Sort intervals by start time
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [
    { start: sorted[0].start, end: sorted[0].end }
  ];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (current.start <= lastMerged.end) {
      // Overlapping or adjacent, merge them by updating the end time
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

export function calculateMergedDuration(timeEntries: { startedAt: number; endedAt: number | null; pausedAt?: number | null }[]): number {
  const intervals: Interval[] = timeEntries.map(e => ({
    start: e.startedAt,
    end: e.endedAt ?? (e.pausedAt ?? Date.now()),
  }));

  const merged = mergeIntervals(intervals);
  return merged.reduce((sum, int) => sum + (int.end - int.start), 0);
}
