import { useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Star, Check, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import {
  useHealthGoals, useSleepLogs, useSleepLastNight, sleepDuration, formatMinutes, todayStr,
} from '../../hooks/useHealth';
import { useConfirm } from '../../components/providers/ConfirmProvider';

export default function SleepView() {
  const goals = useHealthGoals();
  const logs = useSleepLogs(14);
  const lastNight = useSleepLastNight();
  const confirmDialog = useConfirm();

  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:30');
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');

  const previewMin = sleepDuration(bedTime, wakeTime);

  const save = async () => {
    const durationMin = sleepDuration(bedTime, wakeTime);
    const existing = await db.sleepLogs.where('date').equals(todayStr()).first();
    const payload = { date: todayStr(), bedTime, wakeTime, durationMin, quality, note: note.trim() || null };
    if (existing) {
      await db.sleepLogs.update(existing.id!, payload);
    } else {
      await db.sleepLogs.add(payload);
    }
    setNote('');
  };

  const remove = async (id: number, date: string) => {
    const ok = await confirmDialog({
      title: 'Delete sleep log',
      message: `Remove the night of ${date}?`,
      type: 'warning',
      confirmText: 'Delete',
    });
    if (ok) await db.sleepLogs.delete(id);
  };

  const avg = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.durationMin, 0) / logs.length) : 0;
  const maxMin = Math.max(goals.sleepGoalMin, ...logs.map(l => l.durationMin), 1);

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <header className="top">
        <div className="hello">
          <h1>Sleep</h1>
          <p>
            {lastNight
              ? `Last night: ${formatMinutes(lastNight.durationMin)} (${lastNight.bedTime} → ${lastNight.wakeTime}).`
              : 'No log for last night yet — how did you sleep?'}
            {avg > 0 ? ` 14-night average ${formatMinutes(avg)}.` : ''}
          </p>
        </div>
      </header>

      <div className="bento">
        <div className="w span-5">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Log last night</div>
                <div className="sub">Goal: {formatMinutes(goals.sleepGoalMin)}</div>
              </div>
              <Moon size={20} style={{ color: 'var(--violet)' }} />
            </div>
            <div className="event-form-grid">
              <div className="event-form-row">
                <div className="event-form-group">
                  <label>Went to bed</label>
                  <input type="time" className="event-form-input" value={bedTime} onChange={e => setBedTime(e.target.value)} />
                </div>
                <div className="event-form-group">
                  <label>Woke up</label>
                  <input type="time" className="event-form-input" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
                </div>
              </div>

              <div className="sleep-preview">
                That's <b>{formatMinutes(previewMin)}</b>
                {previewMin >= goals.sleepGoalMin ? ' — goal met 🎯' : ` — ${formatMinutes(goals.sleepGoalMin - previewMin)} short of goal`}
              </div>

              <div className="event-form-group">
                <label>Quality</label>
                <div className="sleep-stars">
                  {([1, 2, 3, 4, 5] as const).map(q => (
                    <motion.button key={q} whileTap={{ scale: 0.8 }} className={`sleep-star ${quality >= q ? 'on' : ''}`} onClick={() => setQuality(q)} aria-label={`Quality ${q}`}>
                      <Star size={22} fill={quality >= q ? 'currentColor' : 'none'} />
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="event-form-group">
                <label>Note (optional)</label>
                <input className="event-form-input" placeholder="Late coffee? Weird dreams?" value={note} onChange={e => setNote(e.target.value)} />
              </div>

              <button className="btn primary" onClick={save}>
                <Check size={18} /> {lastNight ? 'Update last night' : 'Save last night'}
              </button>
            </div>
          </div>
        </div>

        <div className="w span-7">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Last 14 nights</div>
                <div className="sub">Bar = duration, dashed line = goal</div>
              </div>
            </div>

            {logs.length === 0 ? (
              <p className="empty-hint">Log a few nights to see your pattern.</p>
            ) : (
              <div className="sleep-chart">
                <div className="sleep-goal-line" style={{ bottom: `${(goals.sleepGoalMin / maxMin) * 100}%` }} />
                {logs.map(l => (
                  <div key={l.id} className="sleep-col" title={`${l.date}: ${formatMinutes(l.durationMin)} · quality ${l.quality}/5`}>
                    <div className="steps-week-bar-track sleep-track">
                      <motion.div
                        className={`sleep-bar q${l.quality}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${(l.durationMin / maxMin) * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                    <span className="steps-week-day">{l.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="event-list" style={{ marginTop: 18 }}>
              {[...logs].reverse().slice(0, 5).map(l => (
                <div key={l.id} className="event-item-card">
                  <div className="event-item-left">
                    <span className="event-item-title">{formatMinutes(l.durationMin)} · {'★'.repeat(l.quality)}{'☆'.repeat(5 - l.quality)}</span>
                    <div className="event-item-meta">
                      <span>{l.bedTime} → {l.wakeTime}</span>
                      <span>{l.date === todayStr() ? 'last night' : l.date}</span>
                      {l.note && <span>· {l.note}</span>}
                    </div>
                  </div>
                  <div className="event-item-right">
                    <button className="ghost-btn" onClick={() => remove(l.id!, l.date)} aria-label="Delete sleep log">
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
