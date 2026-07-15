import * as Icons from 'lucide-react';
import Card from '../../components/ui/Card';
import { getDateString } from '../../utils/date';

interface HabitHeatmapProps {
  habitsData: {
    details: any[];
    days: Date[];
  };
  handleToggleCell: (habitId: number, date: Date) => void;
}

export default function HabitHeatmap({ habitsData, handleToggleCell }: HabitHeatmapProps) {
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
  );
}
