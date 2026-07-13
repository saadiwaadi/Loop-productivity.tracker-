import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

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
export function useRunningTimeEntry() {
  return useLiveQuery(async () => {
    const all = await db.timeEntries.toArray();
    return all.find(e => !e.endedAt);
  });
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
      const endedAt = entry.endedAt ?? Date.now();
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
    cutoff.setHours(0, 0, 0, 0);

    const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();
    return logs.filter(l => new Date(l.completedAt).getTime() >= cutoff.getTime());
  }, [habitId, daysBack]) || [];
}

// 8. Habit Streak Logic (Rolling 7-day window pace checking)
export function useHabitStreak(habitId: number) {
  return useLiveQuery(async () => {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;

    const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();
    const completedDates = new Set(logs.map(l => l.date));
    const target = habit.targetDaysPerWeek;

    const getDateString = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const checkPaceAtDate = (baseDate: Date) => {
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() - i);
        if (completedDates.has(getDateString(d))) {
          count++;
        }
      }
      return count >= target;
    };

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let streak = 0;
    let currentCheckedDate = new Date(today);

    if (checkPaceAtDate(today)) {
      streak = 1;
      currentCheckedDate = today;
    } else if (checkPaceAtDate(yesterday)) {
      streak = 1;
      currentCheckedDate = yesterday;
    } else {
      return 0;
    }

    while (true) {
      const nextDate = new Date(currentCheckedDate);
      nextDate.setDate(currentCheckedDate.getDate() - 1);
      if (checkPaceAtDate(nextDate)) {
        streak++;
        currentCheckedDate = nextDate;
      } else {
        break;
      }
    }

    return streak;
  }, [habitId]) ?? 0;
}

// 9. Settings Singleton
export function useSettings() {
  return useLiveQuery(() => db.settings.get(1));
}
