import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import { calculateHabitStreak } from '../../utils/date';

interface HabitStreaksProps {
  habitsData: {
    details: any[];
    days: Date[];
  };
}

export default function HabitStreaks({ habitsData }: HabitStreaksProps) {
  const confirmDialog = useConfirm();

  const handleDeleteHabit = async (id: number) => {
    const ok = await confirmDialog({
      title: 'Delete Habit',
      message: 'Are you sure you want to delete this habit and all its logged history?',
      type: 'danger',
      confirmText: 'Delete Habit',
    });
    if (ok) {
      db.habits.delete(id);
      db.habitLogs.where('habitId').equals(id).delete();
    }
  };

  const renderIcon = (name: string, size = 18) => {
    const Icon = (Icons as any)[name] || Icons.CheckCircle;
    return <Icon size={size} />;
  };

  return (
    <div className="span-12">
      <div className="card-h" style={{ marginBottom: '14px' }}>
        <div>
          <div className="t">Habit Streaks</div>
          <div className="sub">Rolling consecutive streaks at target consistency</div>
        </div>
      </div>

      <div className="mini-stats">
        {habitsData.details.length === 0 ? (
          <div className="card span-12" style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
            No active streaks. Complete habits to start streaks!
          </div>
        ) : (
          habitsData.details.map(({ habit, completedDates }) => {
            if (!habit.id) return null;
            // Always calculate day-based streak
            const dayStreak = calculateHabitStreak(completedDates, new Date());
            return (
              <div key={habit.id} className="ms" style={{ position: 'relative' }}>
                <div
                  className="ic"
                  style={{ backgroundColor: `var(${habit.colorToken})`, color: '#fff' }}
                >
                  {renderIcon(habit.icon, 18)}
                </div>
                <div className="v">{dayStreak}d</div>
                <div className="k">{habit.name}</div>
                
                <button
                  onClick={() => handleDeleteHabit(habit.id!)}
                  className="absolute right-3 top-3 text-ink-faint hover:text-coral transition-colors"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                  title="Delete Habit"
                >
                  <Icons.Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
