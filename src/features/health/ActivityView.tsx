import { useState } from 'react';
import { motion } from 'motion/react';
import { Footprints, Plus, Trash2, Dumbbell, Check } from 'lucide-react';
import { db } from '../../db/db';
import type { ExerciseLog } from '../../db/db';
import ProgressRing from '../../components/health/ProgressRing';
import CountUp from '../../components/health/CountUp';
import ConfettiBurst from '../../components/health/ConfettiBurst';
import {
  useHealthGoals, useStepsToday, useStepsByDay, logSteps,
  useExerciseLogs, useExerciseWeekMinutes, formatMinutes, todayStr,
} from '../../hooks/useHealth';
import { useConfirm } from '../../components/providers/ConfirmProvider';

const KINDS: ExerciseLog['kind'][] = ['run', 'walk', 'gym', 'cycle', 'sport', 'yoga', 'swim', 'other'];
const INTENSITIES: ExerciseLog['intensity'][] = ['easy', 'moderate', 'hard'];

function StepsCard() {
  const goals = useHealthGoals();
  const steps = useStepsToday();
  const week = useStepsByDay(7);
  const [input, setInput] = useState('');
  const [confetti, setConfetti] = useState(0);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const n = parseInt(input.replace(/[^0-9]/g, ''), 10);
    if (isNaN(n) || n < 0) return;
    const wasBelowGoal = steps < goals.stepGoal;
    await logSteps(n);
    setInput('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    if (wasBelowGoal && n >= goals.stepGoal) setConfetti(c => c + 1);
  };

  const maxWeek = Math.max(goals.stepGoal, ...week.map(d => d.steps));

  return (
    <div className="card steps-card">
      <ConfettiBurst trigger={confetti} />
      <div className="card-h">
        <div>
          <div className="t">Steps today</div>
          <div className="sub">Copy the count from your phone's health app</div>
        </div>
        <Footprints size={20} style={{ color: 'var(--h-blue)' }} />
      </div>

      <div className="steps-body">
        <ProgressRing size={150} stroke={13} progress={steps / goals.stepGoal} color="var(--h-blue)">
          <div className="hrc-value big"><CountUp value={steps} /></div>
          <div className="hrc-unit">of {goals.stepGoal.toLocaleString()}</div>
        </ProgressRing>

        <div className="steps-entry">
          <div className="manual" style={{ marginTop: 0 }}>
            <input
              inputMode="numeric"
              placeholder="Today's steps…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
            />
            <motion.button className="btn primary" onClick={save} whileTap={{ scale: 0.92 }} style={{ flex: 'none' }}>
              {saved ? <Check size={18} /> : <Plus size={18} />}
              {saved ? 'Logged!' : 'Log'}
            </motion.button>
          </div>

          <div className="steps-week">
            {week.map(d => (
              <div key={d.date} className="steps-week-col">
                <div className="steps-week-bar-track">
                  <motion.div
                    className={`steps-week-bar ${d.steps >= goals.stepGoal ? 'hit' : ''}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (d.steps / maxWeek) * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                  />
                </div>
                <span className="steps-week-day">
                  {new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityView() {
  const goals = useHealthGoals();
  const logs = useExerciseLogs(14);
  const weekMin = useExerciseWeekMinutes();
  const confirmDialog = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ExerciseLog['kind']>('gym');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<ExerciseLog['intensity']>('moderate');
  const [calories, setCalories] = useState('');

  const addExercise = async () => {
    const mins = parseInt(duration, 10);
    if (!name.trim() || isNaN(mins) || mins <= 0) return;
    await db.exerciseLogs.add({
      date: todayStr(),
      name: name.trim(),
      kind,
      durationMin: mins,
      intensity,
      calories: calories ? parseInt(calories, 10) : null,
    });
    setName('');
    setDuration('');
    setCalories('');
    setShowForm(false);
  };

  const remove = async (log: ExerciseLog) => {
    const ok = await confirmDialog({
      title: 'Delete workout',
      message: `Remove "${log.name}" from ${log.date}?`,
      type: 'warning',
      confirmText: 'Delete',
    });
    if (ok) await db.exerciseLogs.delete(log.id!);
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
          <h1>Activity</h1>
          <p>{formatMinutes(weekMin)} of {formatMinutes(goals.exerciseWeeklyMin)} active this week.</p>
        </div>
        <div className="top-right">
          <button className="btn primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={18} /> Log workout
          </button>
        </div>
      </header>

      <div className="bento">
        <div className="w span-6"><StepsCard /></div>

        <div className="w span-6">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Workouts</div>
                <div className="sub">Last 14 days</div>
              </div>
              <Dumbbell size={20} style={{ color: 'var(--accent-deep)' }} />
            </div>

            {showForm && (
              <motion.div
                className="exercise-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="event-form-grid">
                  <div className="event-form-group">
                    <label>What did you do?</label>
                    <input className="event-form-input" placeholder="e.g. Push day, 5k run…" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="event-form-row">
                    <div className="event-form-group">
                      <label>Type</label>
                      <select className="event-form-input" value={kind} onChange={e => setKind(e.target.value as ExerciseLog['kind'])}>
                        {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="event-form-group">
                      <label>Minutes</label>
                      <input className="event-form-input" inputMode="numeric" placeholder="45" value={duration} onChange={e => setDuration(e.target.value)} />
                    </div>
                  </div>
                  <div className="event-form-row">
                    <div className="event-form-group">
                      <label>Intensity</label>
                      <div className="category-pill-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {INTENSITIES.map(i => (
                          <button
                            key={i}
                            className={`category-pill-btn ${intensity === i ? 'active personal' : ''}`}
                            onClick={() => setIntensity(i)}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="event-form-group">
                      <label>Calories (optional)</label>
                      <input className="event-form-input" inputMode="numeric" placeholder="—" value={calories} onChange={e => setCalories(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn primary" onClick={addExercise}><Check size={18} /> Save workout</button>
                </div>
              </motion.div>
            )}

            <div className="event-list" style={{ marginTop: showForm ? 16 : 0 }}>
              {logs.length === 0 && <p className="empty-hint">Nothing logged yet. Your future self is watching.</p>}
              {logs.map(log => (
                <div key={log.id} className="event-item-card">
                  <div className="event-item-left">
                    <span className="event-item-title">{log.name}</span>
                    <div className="event-item-meta">
                      <span className="event-category-badge" style={{ background: 'color-mix(in srgb, var(--h-blue) 18%, transparent)', color: 'var(--h-blue)' }}>
                        {log.kind}
                      </span>
                      <span>{log.durationMin}m · {log.intensity}{log.calories ? ` · ${log.calories} kcal` : ''}</span>
                      <span>{log.date === todayStr() ? 'today' : log.date}</span>
                    </div>
                  </div>
                  <div className="event-item-right">
                    <button className="ghost-btn" onClick={() => remove(log)} aria-label="Delete workout">
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
