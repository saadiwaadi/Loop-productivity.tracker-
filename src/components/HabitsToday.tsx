import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../db/db';
import { getDateString, calculateHabitStreak } from '../utils/date';


export default function HabitsToday() {
  const habitDetails = useLiveQuery(async () => {
    const allHabits = await db.habits.toArray();
    const activeHabits = allHabits.filter(h => h.archivedAt === null || h.archivedAt === undefined);
    const logs = await db.habitLogs.toArray();

    const now = new Date();
    const todayStr = getDateString(now);

    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    return activeHabits.map(h => {
      const habitLogs = logs.filter(l => l.habitId === h.id);
      const last7DaysLogs = habitLogs.filter(l => new Date(l.completedAt).getTime() >= cutoff.getTime());
      
      const completedDates = new Set(habitLogs.map(l => l.date));
      const target = h.targetDaysPerWeek;

      const streak = calculateHabitStreak(target, completedDates, now);

      const isTodayCompleted = completedDates.has(todayStr);

      return {
        habit: h,
        completedCount: last7DaysLogs.length,
        isTodayCompleted,
        streak,
      };
    });
  }) || [];

  const handleToggleHabit = async (habitId: number, isTodayCompleted: boolean) => {
    const todayStr = getDateString(new Date());

    if (isTodayCompleted) {
      const todayLogs = await db.habitLogs
        .where('habitId')
        .equals(habitId)
        .filter(l => l.date === todayStr)
        .toArray();
      
      if (todayLogs.length > 0) {
        await Promise.all(todayLogs.map(l => l.id && db.habitLogs.delete(l.id)));
      }
    } else {
      const normalizedDate = new Date();
      normalizedDate.setHours(12, 0, 0, 0); // Normalize to local noon
      await db.habitLogs.add({
        habitId,
        date: todayStr,
        completedAt: normalizedDate,
      });
    }
  };

  const renderIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.CheckCircle;
    return <Icon size={18} />;
  };

  // Calculate completion percentage
  const totalHabits = habitDetails.length;
  const completedToday = habitDetails.filter(hd => hd.isTodayCompleted).length;
  const pct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const circumference = 110; // 2 * PI * 17.5
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div>
      <div className="card-h">
        <div>
          <div className="t">Habits Today</div>
          <div className="sub">Consistency over intensity</div>
        </div>
        
        {totalHabits > 0 && (
          <div className="ring-mini">
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="17.5"
                stroke="var(--stroke-2)"
                strokeWidth="4.5"
                fill="none"
              />
              <circle
                cx="22"
                cy="22"
                r="17.5"
                stroke="var(--accent)"
                strokeWidth="4.5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.35s ease' }}
              />
            </svg>
            <b>{pct}%</b>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {habitDetails.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)', fontSize: '14px' }}>
            No active habits. Create them in Settings!
          </div>
        ) : (
          habitDetails.map(({ habit, completedCount, isTodayCompleted, streak }) => {
            if (!habit.id) return null;

            const dots = [];
            for (let i = 0; i < habit.targetDaysPerWeek; i++) {
              const isFilled = i < completedCount;
              dots.push(
                <div
                  key={i}
                  className={`dot ${isFilled ? 'f' : ''}`}
                  onClick={() => habit.id && handleToggleHabit(habit.id, isTodayCompleted)}
                  style={{
                    backgroundColor: isFilled ? `var(${habit.colorToken})` : undefined,
                  }}
                  title={isTodayCompleted ? 'Completed today' : 'Toggle completion for today'}
                />
              );
            }

            return (
              <div key={habit.id} className="habit">
                <div
                  className="habit-ic"
                  style={{ backgroundColor: `var(${habit.colorToken})`, cursor: 'pointer' }}
                  onClick={() => habit.id && handleToggleHabit(habit.id, isTodayCompleted)}
                >
                  {renderIcon(habit.icon)}
                </div>
                <div className="info">
                  <div className="n">{habit.name}</div>
                  <div className="s">
                    {streak > 0 ? `Streak: ${streak}${habit.targetDaysPerWeek === 7 ? 'd' : 'w'}` : `Target: ${habit.targetDaysPerWeek}x/wk`}
                  </div>
                </div>
                <div className="dots">{dots}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
