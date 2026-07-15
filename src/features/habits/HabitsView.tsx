import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/Card';
import { useConfirm } from '../../components/ConfirmProvider';
import { getDateString, calculateHabitStreak } from '../../utils/date';


export default function HabitsView() {
  const confirmDialog = useConfirm();
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
      d.setDate(now.getDate() - i);
      d.setHours(12, 0, 0, 0);
      days.push(d);
    }

    const details = activeHabits.map(h => {
      const habitLogs = logs.filter(l => l.habitId === h.id);
      const completedDates = new Set(habitLogs.map(l => l.date));
      const target = h.targetDaysPerWeek;

      const streak = calculateHabitStreak(target, completedDates, now);

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

  // --- HABIT BUILDER STATE ---
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState(4);
  const [colorToken, setColorToken] = useState('--violet');
  const [iconName, setIconName] = useState('CheckCircle');

  const colorOptions = [
    { label: 'Violet', value: '--violet' },
    { label: 'Sky', value: '--sky' },
    { label: 'Coral', value: '--coral' },
    { label: 'Mint', value: '--mint' },
    { label: 'Amber', value: '--amber' },
  ];

  const iconOptions = ['CheckCircle', 'Zap', 'BookOpen', 'Heart', 'Smile', 'Compass', 'Flame', 'Shield'];

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

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.habits.add({
      name: name.trim(),
      icon: iconName,
      colorToken,
      targetDaysPerWeek: targetDays,
      createdAt: new Date(),
    });

    setName('');
    setTargetDays(4);
    setColorToken('--violet');
    setIconName('CheckCircle');
  };

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

  // Helper: Render Dynamic Icons
  const renderIcon = (name: string, size = 18) => {
    const Icon = (Icons as any)[name] || Icons.CheckCircle;
    return <Icon size={size} />;
  };

  // Helper: Calculate shading level
  const getShadingClass = (habitId: number, target: number, date: Date) => {
    const detail = habitsData.details.find(d => d.habit.id === habitId);
    if (!detail) return 'cell';

    const isCompleted = detail.completedDates.has(getDateString(date));
    if (!isCompleted) return 'cell';

    // Calculate rolling 7-day rate ending on this specific date using date string logic
    let completedCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() - i);
      if (detail.completedDates.has(getDateString(d))) {
        completedCount++;
      }
    }

    const rate = completedCount / target;

    if (rate === 0) return 'cell';
    if (rate < 0.5) return 'cell l1';
    if (rate < 1.0) return 'cell l2';
    return 'cell l3';
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
        <Card className="span-8" style={{ padding: '24px' }}>
          <div className="card-h" style={{ marginBottom: '20px' }}>
            <div>
              <div className="t">Heatmap</div>
              <div className="sub">Last 14 days. Tapping a cell toggles completion.</div>
            </div>
          </div>

          {habitsData.details.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-faint)', fontSize: '14px' }}>
              No habits created. Build one to start tracking!
            </div>
          ) : (
            <>
              {/* Header Days Row */}
              <div className="week-head">
                <div style={{ width: 'var(--habit-lbl-width)' }} />
                <div className="days">
                  {habitsData.days.map((day, idx) => (
                    <div key={idx} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                      <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap Grid Row per Habit */}
              <div className="hgrid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {habitsData.details.map(({ habit }) => {
                  if (!habit.id) return null;

                  return (
                    <div
                      key={habit.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'var(--habit-lbl-width) 1fr',
                        width: '100%',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div className="lbl">
                        <div
                          className="ic"
                          style={{
                            backgroundColor: `var(${habit.colorToken})`,
                            display: 'grid',
                            placeItems: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                          }}
                        >
                          {renderIcon(habit.icon, 16)}
                        </div>
                        <span className="truncate text-sm font-semibold max-w-[120px]">{habit.name}</span>
                      </div>

                      <div className="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '6px' }}>
                        {habitsData.days.map((day, idx) => {
                          const shadingClass = getShadingClass(habit.id!, habit.targetDaysPerWeek, day);
                          const isDone = shadingClass !== 'cell';

                          return (
                            <div
                              key={idx}
                              onClick={() => handleToggleCell(habit.id!, day)}
                              className={shadingClass}
                              style={{
                                backgroundColor: isDone && shadingClass === 'cell l1'
                                  ? `color-mix(in srgb, var(${habit.colorToken}) 35%, transparent)`
                                  : isDone && shadingClass === 'cell l2'
                                  ? `color-mix(in srgb, var(${habit.colorToken}) 65%, transparent)`
                                  : isDone && shadingClass === 'cell l3'
                                  ? `var(${habit.colorToken})`
                                  : undefined,
                                borderRadius: '6px',
                                aspectRatio: '1',
                                cursor: 'pointer',
                              }}
                              title={`${habit.name} - ${day.toLocaleDateString()}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Habit Creation Panel (4 columns) */}
        <Card className="span-4" style={{ padding: '24px' }}>
          <div className="card-h" style={{ marginBottom: '16px' }}>
            <div>
              <div className="t">Build Habit</div>
              <div className="sub">Establish your new routine</div>
            </div>
          </div>

          <form onSubmit={handleCreateHabit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                Habit Name
              </label>
              <input
                type="text"
                placeholder="e.g. Code, Gym, Sleep"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--stroke-2)',
                  color: 'var(--ink)',
                  outline: 'none',
                  fontSize: '13px',
                }}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                Target Days Per Week: <strong className="text-ink">{targetDays} days</strong>
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={targetDays}
                onChange={e => setTargetDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--ink)',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                Color
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {colorOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColorToken(opt.value)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: `var(${opt.value})`,
                      border: colorToken === opt.value ? '3px solid var(--ink)' : '2px solid var(--card-border)',
                      cursor: 'pointer',
                      transform: colorToken === opt.value ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.15s',
                    }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            {/* Icons */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                Icon
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {iconOptions.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIconName(ic)}
                    className="ghost-btn"
                    style={{
                      padding: '8px',
                      border: iconName === ic ? '2px solid var(--ink)' : undefined,
                      backgroundColor: iconName === ic ? 'var(--stroke-2)' : undefined,
                      borderRadius: '8px',
                    }}
                  >
                    {renderIcon(ic, 14)}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn primary text-xs" style={{ padding: '10px', borderRadius: '12px', marginTop: '6px' }}>
              Create Habit
            </button>
          </form>
        </Card>

        {/* Streak Stats Panel (12 columns) */}
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
              habitsData.details.map(({ habit, streak }) => {
                if (!habit.id) return null;
                return (
                  <div key={habit.id} className="ms" style={{ position: 'relative' }}>
                    <div
                      className="ic"
                      style={{ backgroundColor: `var(${habit.colorToken})`, color: '#fff' }}
                    >
                      {renderIcon(habit.icon, 18)}
                    </div>
                    <div className="v">{streak}{habit.targetDaysPerWeek === 7 ? 'd' : 'w'}</div>
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
      </div>
    </motion.div>
  );
}
