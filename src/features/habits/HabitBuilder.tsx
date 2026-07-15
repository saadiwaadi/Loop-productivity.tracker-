import { useState } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/ui/Card';

export default function HabitBuilder() {
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

  const renderIcon = (name: string, size = 18) => {
    const Icon = (Icons as any)[name] || Icons.CheckCircle;
    return <Icon size={size} />;
  };

  return (
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
  );
}
