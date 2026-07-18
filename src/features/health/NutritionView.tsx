import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassWater, Plus, Trash2, Check, X, UtensilsCrossed } from 'lucide-react';
import { db } from '../../db/db';
import type { DietLog } from '../../db/db';
import CountUp from '../../components/health/CountUp';
import ConfettiBurst from '../../components/health/ConfettiBurst';
import {
  useHealthGoals, useWaterToday, useWaterByDay, logWater,
  useDietLogs, todayStr, saveHealthGoals,
} from '../../hooks/useHealth';
import { useConfirm } from '../../components/providers/ConfirmProvider';

const MEALS: DietLog['meal'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const POURS = [150, 250, 500];

function WaterCard() {
  const goals = useHealthGoals();
  const todayMl = useWaterToday();
  const week = useWaterByDay(7);
  const [confetti, setConfetti] = useState(0);

  const fill = Math.min(1, todayMl / goals.waterGoalMl);

  const pour = async (ml: number) => {
    const wasBelow = todayMl < goals.waterGoalMl;
    await logWater(ml);
    if (wasBelow && todayMl + ml >= goals.waterGoalMl) setConfetti(c => c + 1);
  };

  return (
    <div className="card water-card">
      <ConfettiBurst trigger={confetti} />
      <div className="card-h">
        <div>
          <div className="t">Water</div>
          <div className="sub">Small pours count too</div>
        </div>
        <GlassWater size={20} style={{ color: 'var(--sky)' }} />
      </div>

      <div className="water-body">
        {/* Animated glass */}
        <div className="water-glass">
          <motion.div
            className="water-fill"
            initial={false}
            animate={{ height: `${Math.max(4, fill * 100)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="water-wave" />
          </motion.div>
          <div className="water-glass-label">
            <span className="hrc-value"><CountUp value={todayMl} /></span>
            <span className="hrc-unit">/ {goals.waterGoalMl} ml</span>
          </div>
        </div>

        <div className="water-side">
          <div className="water-btns">
            {POURS.map(ml => (
              <motion.button key={ml} className="btn soft water-pour" whileTap={{ scale: 0.9 }} onClick={() => pour(ml)}>
                <Plus size={16} /> {ml} ml
              </motion.button>
            ))}
          </div>

          <div className="steps-week water-week">
            {week.map(d => (
              <div key={d.date} className="steps-week-col">
                <div className="steps-week-bar-track">
                  <motion.div
                    className={`steps-week-bar water ${d.totalMl >= goals.waterGoalMl ? 'hit' : ''}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, Math.min(100, (d.totalMl / goals.waterGoalMl) * 100))}%` }}
                    transition={{ duration: 0.7 }}
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

export default function NutritionView() {
  const goals = useHealthGoals();
  const dietLogs = useDietLogs(7);
  const confirmDialog = useConfirm();

  const [meal, setMeal] = useState<DietLog['meal']>('lunch');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [onTrack, setOnTrack] = useState(true);
  const [editingGoals, setEditingGoals] = useState(false);
  const [dietNotes, setDietNotes] = useState(goals.dietNotes ?? '');

  const todayLogs = dietLogs.filter(l => l.date === todayStr());
  const todayCalories = todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0);

  const addMeal = async () => {
    if (!description.trim()) return;
    await db.dietLogs.add({
      date: todayStr(),
      meal,
      description: description.trim(),
      calories: calories ? parseInt(calories, 10) : null,
      onTrack,
    });
    setDescription('');
    setCalories('');
    setOnTrack(true);
  };

  const remove = async (log: DietLog) => {
    const ok = await confirmDialog({
      title: 'Delete entry',
      message: `Remove this ${log.meal} entry?`,
      type: 'warning',
      confirmText: 'Delete',
    });
    if (ok) await db.dietLogs.delete(log.id!);
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
          <h1>Nutrition</h1>
          <p>
            Hydration and meals, checked against your own rules.
            {goals.calorieGoal ? ` ${todayCalories} / ${goals.calorieGoal} kcal today.` : ''}
          </p>
        </div>
      </header>

      <div className="bento">
        <div className="w span-6"><WaterCard /></div>

        <div className="w span-6">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Meals</div>
                <div className="sub">Did it match your dietary goals?</div>
              </div>
              <button className="ghost-btn" onClick={() => { setEditingGoals(e => !e); setDietNotes(goals.dietNotes ?? ''); }} aria-label="Edit dietary goals">
                <UtensilsCrossed size={17} />
              </button>
            </div>

            {editingGoals && (
              <div className="event-form-grid" style={{ marginBottom: 16 }}>
                <div className="event-form-group">
                  <label>Your dietary goals</label>
                  <textarea
                    className="event-form-textarea"
                    rows={3}
                    placeholder="e.g. No sugar on weekdays, protein every meal, home-cooked dinners…"
                    value={dietNotes}
                    onChange={e => setDietNotes(e.target.value)}
                  />
                </div>
                <button
                  className="btn primary"
                  onClick={async () => { await saveHealthGoals({ dietNotes: dietNotes.trim() || null }); setEditingGoals(false); }}
                >
                  <Check size={18} /> Save goals
                </button>
              </div>
            )}

            {!editingGoals && goals.dietNotes && (
              <div className="diet-goal-note">{goals.dietNotes}</div>
            )}

            <div className="event-form-grid" style={{ marginBottom: 16 }}>
              <div className="category-pill-group">
                {MEALS.map(m => (
                  <button key={m} className={`category-pill-btn ${meal === m ? 'active education' : ''}`} onClick={() => setMeal(m)}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="event-form-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <input
                  className="event-form-input"
                  placeholder="What did you eat?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMeal()}
                />
                <input
                  className="event-form-input"
                  style={{ width: 90 }}
                  inputMode="numeric"
                  placeholder="kcal"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                />
              </div>
              <div className="event-form-checkbox-row">
                <label htmlFor="ontrack">On track with my dietary goals</label>
                <input id="ontrack" type="checkbox" checked={onTrack} onChange={e => setOnTrack(e.target.checked)} />
              </div>
              <button className="btn dark" onClick={addMeal}><Plus size={18} /> Add meal</button>
            </div>

            <div className="event-list">
              {dietLogs.length === 0 && <p className="empty-hint">No meals logged this week.</p>}
              {dietLogs.map(log => (
                <div key={log.id} className="event-item-card">
                  <div className="event-item-left">
                    <span className="event-item-title">{log.description}</span>
                    <div className="event-item-meta">
                      <span className="event-category-badge" style={{ background: 'var(--stroke-2)', color: 'var(--ink-soft)' }}>{log.meal}</span>
                      {log.calories ? <span>{log.calories} kcal</span> : null}
                      <span>{log.date === todayStr() ? 'today' : log.date}</span>
                      <span className={`diet-track ${log.onTrack ? 'ok' : 'off'}`}>
                        {log.onTrack ? <Check size={12} /> : <X size={12} />}
                        {log.onTrack ? 'on track' : 'off plan'}
                      </span>
                    </div>
                  </div>
                  <div className="event-item-right">
                    <button className="ghost-btn" onClick={() => remove(log)} aria-label="Delete meal">
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
