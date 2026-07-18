import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { getDateString, calculateHabitStreak } from '../../utils/date';
import HabitHeatmap from './HabitHeatmap';
import HabitBuilder from './HabitBuilder';
import HabitStreaks from './HabitStreaks';

export default function HabitsView() {
  // --- DATABASE QUERIES ---
  const habitsData = useLiveQuery(async () => {
    const allHabits = await db.habits.toArray();
    const activeHabits = allHabits.filter(h => h.archivedAt === null || h.archivedAt === undefined);
    const logs = await db.habitLogs.toArray();

    const now = new Date();

    // Last 14 days array (ending today), normalized to noon local time
    const days: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const details = activeHabits.map(h => {
      const habitLogs = logs.filter(l => l.habitId === h.id);
      const completedDates = new Set(habitLogs.map(l => l.date));

      const streak = calculateHabitStreak(completedDates, now);

      return {
        habit: h,
        logs: habitLogs,
        completedDates,
        streak,
      };
    });

    return {
      details,
      days,
    };
  }) || { details: [], days: [] };

  // --- HANDLERS ---
  const handleToggleCell = async (habitId: number, date: Date) => {
    const dateStr = getDateString(date);
    const existingLogs = await db.habitLogs
      .where('habitId')
      .equals(habitId)
      .filter(l => l.date === dateStr)
      .toArray();

    if (existingLogs.length > 0) {
      await Promise.all(existingLogs.map(l => l.id && db.habitLogs.delete(l.id)));
    } else {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(12, 0, 0, 0); // Normalize to local noon
      await db.habitLogs.add({
        habitId,
        date: dateStr,
        completedAt: normalizedDate,
      });
    }
  };

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* View Header */}
      <header className="top">
        <div className="hello">
          <h1>Habits</h1>
          <p>Configure custom weekly targets and track rolling streaks.</p>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="bento">
        {/* Heatmap Grid Card (8 columns) */}
        <HabitHeatmap habitsData={habitsData} handleToggleCell={handleToggleCell} />

        {/* Habit Creation Panel (4 columns) */}
        <HabitBuilder />

        {/* Streak Stats Panel (12 columns) */}
        <HabitStreaks habitsData={habitsData} />
      </div>
    </motion.div>
  );
}
