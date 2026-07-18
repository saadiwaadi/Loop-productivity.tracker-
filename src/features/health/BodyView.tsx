import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Scale, Check, Trash2, Target, Flag } from 'lucide-react';
import { db } from '../../db/db';
import CountUp from '../../components/health/CountUp';
import { useHealthGoals, useWeightLogs, saveHealthGoals, todayStr } from '../../hooks/useHealth';
import { useConfirm } from '../../components/providers/ConfirmProvider';

function WeightChart({ logs, goalKg }: { logs: { date: string; weightKg: number }[]; goalKg?: number | null }) {
  const W = 560, H = 180, PAD = 24;

  const { path, points, min, max } = useMemo(() => {
    const values = logs.map(l => l.weightKg);
    const allValues = goalKg ? [...values, goalKg] : values;
    let min = Math.min(...allValues), max = Math.max(...allValues);
    if (max - min < 2) { min -= 1; max += 1; }
    const span = max - min;
    const x = (i: number) => logs.length === 1 ? W / 2 : PAD + (i / (logs.length - 1)) * (W - PAD * 2);
    const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
    const points = logs.map((l, i) => ({ x: x(i), y: y(l.weightKg), ...l }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { path, points, min, max };
  }, [logs, goalKg]);

  const goalY = goalKg ? PAD + (1 - (goalKg - min) / (max - min)) * (H - PAD * 2) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img" aria-label="Weight trend">
      {goalY !== null && (
        <>
          <line x1={PAD} x2={W - PAD} y1={goalY} y2={goalY} stroke="var(--accent-deep)" strokeDasharray="6 6" strokeWidth="1.5" opacity="0.7" />
          <text x={W - PAD} y={goalY - 6} textAnchor="end" fontSize="11" fill="var(--accent-deep)" fontWeight="700">goal {goalKg} kg</text>
        </>
      )}
      <motion.path
        d={path}
        fill="none"
        stroke="var(--h-blue)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
      />
      {points.map(p => (
        <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="var(--card-solid)" stroke="var(--h-blue)" strokeWidth="2.5">
          <title>{p.date}: {p.weightKg} kg</title>
        </circle>
      ))}
    </svg>
  );
}

export default function BodyView() {
  const goals = useHealthGoals();
  const logs = useWeightLogs();
  const confirmDialog = useConfirm();

  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const last = logs.length > 0 ? logs[logs.length - 1] : null;
  const first = logs.length > 0 ? logs[0] : null;
  const delta = last && first ? +(last.weightKg - first.weightKg).toFixed(1) : null;
  const toGoal = last && goals.weightGoalKg ? +(last.weightKg - goals.weightGoalKg).toFixed(1) : null;

  const daysSinceLast = last
    ? Math.floor((new Date(todayStr() + 'T00:00').getTime() - new Date(last.date + 'T00:00').getTime()) / 86400000)
    : null;
  const dueForWeighIn = daysSinceLast === null || daysSinceLast >= 7;

  const save = async () => {
    const kg = parseFloat(weight);
    if (isNaN(kg) || kg <= 0) return;
    const existing = await db.weightLogs.where('date').equals(todayStr()).first();
    if (existing) {
      await db.weightLogs.update(existing.id!, { weightKg: kg, note: note.trim() || null });
    } else {
      await db.weightLogs.add({ date: todayStr(), weightKg: kg, note: note.trim() || null });
    }
    if (!goals.startWeightKg) await saveHealthGoals({ startWeightKg: kg });
    setWeight('');
    setNote('');
  };

  const saveGoal = async () => {
    const kg = parseFloat(goalInput);
    if (isNaN(kg) || kg <= 0) return;
    await saveHealthGoals({ weightGoalKg: kg });
    setEditingGoal(false);
  };

  const remove = async (id: number, date: string) => {
    const ok = await confirmDialog({
      title: 'Delete weigh-in',
      message: `Remove the entry from ${date}?`,
      type: 'warning',
      confirmText: 'Delete',
    });
    if (ok) await db.weightLogs.delete(id);
  };

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <header className="top">
        <div className="hello">
          <h1>Body</h1>
          <p>
            {dueForWeighIn
              ? 'Weekly weigh-in is due — hop on the scale.'
              : `Next weigh-in in ${7 - (daysSinceLast ?? 0)} day${7 - (daysSinceLast ?? 0) === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="top-right">
          {last && (
            <div className="stat">
              <div className="k">current</div>
              <div className="v"><CountUp value={last.weightKg} decimals={1} />kg</div>
            </div>
          )}
        </div>
      </header>

      <div className="bento">
        <div className="w span-4">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Weigh in</div>
                <div className="sub">Once a week keeps the trend meaningful</div>
              </div>
              <Scale size={20} style={{ color: 'var(--h-blue)' }} />
            </div>
            <div className="event-form-grid">
              <div className="event-form-group">
                <label>Weight (kg)</label>
                <input className="event-form-input" inputMode="decimal" placeholder="72.4" value={weight} onChange={e => setWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
              </div>
              <div className="event-form-group">
                <label>Note (optional)</label>
                <input className="event-form-input" placeholder="Morning, after run…" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <button className="btn primary" onClick={save}><Check size={18} /> Record</button>
            </div>

            <div className="goal-box">
              <div className="goal-box-h">
                <span><Target size={15} /> Goal weight</span>
                <button className="ghost-btn" style={{ width: 30, height: 30 }} onClick={() => { setEditingGoal(g => !g); setGoalInput(goals.weightGoalKg?.toString() ?? ''); }} aria-label="Edit goal">
                  <Flag size={14} />
                </button>
              </div>
              {editingGoal ? (
                <div className="manual" style={{ marginTop: 8 }}>
                  <input inputMode="decimal" placeholder="68.0" value={goalInput} onChange={e => setGoalInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveGoal()} />
                  <button className="btn dark" style={{ flex: 'none' }} onClick={saveGoal}><Check size={16} /></button>
                </div>
              ) : (
                <div className="goal-box-v">
                  {goals.weightGoalKg ? `${goals.weightGoalKg} kg` : 'Not set'}
                  {toGoal !== null && (
                    <span className="weight-goal-chip">{Math.abs(toGoal)} kg {toGoal > 0 ? 'to lose' : toGoal < 0 ? 'below goal' : '— you made it!'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w span-8">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Trend</div>
                <div className="sub">
                  {delta !== null
                    ? `${delta > 0 ? '+' : ''}${delta} kg since your first weigh-in (${first!.date})`
                    : 'Every journey starts with one data point'}
                </div>
              </div>
            </div>
            {logs.length === 0 ? (
              <p className="empty-hint">No weigh-ins yet.</p>
            ) : (
              <WeightChart logs={logs} goalKg={goals.weightGoalKg} />
            )}

            <div className="event-list" style={{ marginTop: 16 }}>
              {[...logs].reverse().slice(0, 6).map(l => (
                <div key={l.id} className="event-item-card">
                  <div className="event-item-left">
                    <span className="event-item-title">{l.weightKg} kg</span>
                    <div className="event-item-meta">
                      <span>{l.date === todayStr() ? 'today' : l.date}</span>
                      {l.note && <span>· {l.note}</span>}
                    </div>
                  </div>
                  <div className="event-item-right">
                    <button className="ghost-btn" onClick={() => remove(l.id!, l.date)} aria-label="Delete weigh-in">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
