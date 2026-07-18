import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { mergeIntervals } from '../../hooks/useDb';
import { calculateHabitStreak } from '../../utils/date';
import PresenceStats from './PresenceStats';
import FocusDistribution from './FocusDistribution';
import InitiativeProgress from './InitiativeProgress';

type FilterRange = 'week' | 'month' | 'all';

interface PeriodStats {
  totalHours: number;
  completedTasksCount: number;
  habitCompletions: number;
}

function computePeriod(
  timeEntries: any[],
  tasks: any[],
  habitLogs: any[],
  start: number,
  end: number
): PeriodStats {
  const inRange = (t: number) => t >= start && t < end;

  const rangeEntries = timeEntries.filter(e => inRange(e.startedAt));
  const intervals = rangeEntries.map(e => ({
    start: e.startedAt,
    end: e.endedAt ?? (e.pausedAt ?? Date.now()),
  }));
  const totalHours = mergeIntervals(intervals).reduce(
    (sum, int) => sum + (int.end - int.start) / 3600000, 0);

  const completedTasksCount = tasks.filter(
    t => t.done && t.doneAt && inRange(new Date(t.doneAt).getTime())).length;

  const habitCompletions = habitLogs.filter(l => {
    const t = new Date(l.date + 'T00:00').getTime();
    return inRange(t);
  }).length;

  return { totalHours: +totalHours.toFixed(1), completedTasksCount, habitCompletions };
}

function DeltaBadge({ current, previous, unit }: { current: number; previous: number; unit?: string }) {
  if (previous === 0 && current === 0) return null;
  const diff = +(current - previous).toFixed(1);
  const up = diff > 0;
  const flat = diff === 0;
  return (
    <span className={`delta-badge ${flat ? 'flat' : up ? 'up' : 'down'}`}>
      {flat ? <Icons.Minus size={11} /> : up ? <Icons.ArrowUpRight size={11} /> : <Icons.ArrowDownRight size={11} />}
      {flat ? 'same' : `${Math.abs(diff)}${unit ?? ''} vs prev`}
    </span>
  );
}

export default function AnalyzerView() {
  const [range, setRange] = useState<FilterRange>('month');
  // offset in months (0 = current) when range === 'month'
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const viewedMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

  const analyzerData = useLiveQuery(async () => {
    const projects = await db.projects.toArray();
    const tasks = await db.tasks.toArray();
    const habits = await db.habits.toArray();
    const habitLogs = await db.habitLogs.toArray();
    const timeEntries = await db.timeEntries.toArray();

    // Determine current + previous period bounds
    let start: number, end: number, prevStart: number, prevEnd: number;
    if (range === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      start = m.getTime();
      end = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
      prevStart = new Date(m.getFullYear(), m.getMonth() - 1, 1).getTime();
      prevEnd = start;
    } else if (range === 'week') {
      end = Date.now();
      start = end - 7 * 86400000;
      prevEnd = start;
      prevStart = start - 7 * 86400000;
    } else {
      start = 0;
      end = Date.now();
      prevStart = 0;
      prevEnd = 0;
    }

    const current = computePeriod(timeEntries, tasks, habitLogs, start, end);
    const previous = range === 'all'
      ? { totalHours: 0, completedTasksCount: 0, habitCompletions: 0 }
      : computePeriod(timeEntries, tasks, habitLogs, prevStart, prevEnd);

    const rangeEntries = timeEntries.filter(e => e.startedAt >= start && e.startedAt < end);

    // Longest current habit streak
    const activeHabits = habits.filter(h => h.archivedAt === null || h.archivedAt === undefined);
    let maxStreakVal = 0;
    activeHabits.forEach(h => {
      const logs = habitLogs.filter(l => l.habitId === h.id);
      const streak = calculateHabitStreak(new Set(logs.map(l => l.date)), now);
      if (streak > maxStreakVal) maxStreakVal = streak;
    });

    const activeProjects = projects.filter(p => p.status === 'active');

    // Pie chart shares
    const projectShares = projects.map(p => {
      const projEntries = rangeEntries.filter(e => e.projectId === p.id);
      const hours = projEntries.reduce((sum, entry) => {
        const entryEnd = entry.endedAt ?? (entry.pausedAt ?? Date.now());
        return sum + (entryEnd - entry.startedAt) / 3600000;
      }, 0);
      return { id: p.id, name: p.name, value: parseFloat(hours.toFixed(1)), colorToken: p.colorToken };
    }).filter(p => p.value > 0);

    // Active project progress list
    const projectProgress = activeProjects.map(p => {
      const projTasks = tasks.filter(t => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(t => t.done).length;
      return {
        id: p.id, name: p.name, colorToken: p.colorToken,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }).sort((a, b) => b.progress - a.progress);

    // 6-month rhythm (focus hours + tasks per month)
    const monthly = [] as { label: string; hours: number; tasks: number }[];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = m.getTime();
      const me = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
      const stats = computePeriod(timeEntries, tasks, habitLogs, ms, me);
      monthly.push({
        label: m.toLocaleString('en-US', { month: 'short' }),
        hours: stats.totalHours,
        tasks: stats.completedTasksCount,
      });
    }

    // Busiest day-of-week for focus in range
    const dayTotals = new Array(7).fill(0);
    rangeEntries.forEach(e => {
      const entryEnd = e.endedAt ?? (e.pausedAt ?? Date.now());
      dayTotals[new Date(e.startedAt).getDay()] += (entryEnd - e.startedAt) / 3600000;
    });
    const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const bestDay = Math.max(...dayTotals) > 0
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bestDayIdx]
      : null;

    return {
      current, previous,
      maxStreak: `${maxStreakVal}d`,
      activeProjectsCount: activeProjects.length,
      projectShares, projectProgress, monthly, bestDay,
    };
  }, [range, monthOffset]);

  const data = analyzerData ?? {
    current: { totalHours: 0, completedTasksCount: 0, habitCompletions: 0 },
    previous: { totalHours: 0, completedTasksCount: 0, habitCompletions: 0 },
    maxStreak: '0d', activeProjectsCount: 0,
    projectShares: [], projectProgress: [], monthly: [], bestDay: null,
  };

  const monthLabel = viewedMonth.toLocaleString('en-US', { month: 'long', year: monthOffset > 0 ? 'numeric' : undefined });

  const getRangeLabel = () => {
    if (range === 'month') return monthLabel;
    if (range === 'week') return 'Last 7 Days';
    return 'All Time';
  };

  const maxMonthlyHours = Math.max(1, ...data.monthly.map(m => m.hours));

  const insights: string[] = [];
  if (analyzerData) {
    const { current, previous } = data;
    if (range !== 'all' && previous.totalHours > 0) {
      const pct = Math.round(((current.totalHours - previous.totalHours) / previous.totalHours) * 100);
      if (Math.abs(pct) >= 10) {
        insights.push(pct > 0
          ? `Focus time is up ${pct}% compared to the previous ${range}.`
          : `Focus time dropped ${Math.abs(pct)}% versus the previous ${range}.`);
      }
    }
    if (data.bestDay) insights.push(`${data.bestDay} is your most productive day in this period.`);
    if (current.habitCompletions > 0) insights.push(`${current.habitCompletions} habit check-ins logged in this period.`);
    if (current.totalHours > 0 && current.completedTasksCount > 0) {
      insights.push(`That's roughly ${(current.totalHours / current.completedTasksCount).toFixed(1)}h of focus per completed task.`);
    }
    if (insights.length === 0) insights.push('Log some focus sessions and tasks to unlock insights here.');
  }

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
          <h1>Analyzer</h1>
          <p>In-depth assessment of your output for {getRangeLabel()}.</p>
        </div>
        <div className="top-right analyzer-controls">
          {range === 'month' && (
            <div className="month-stepper">
              <button className="ghost-btn" onClick={() => setMonthOffset(o => o + 1)} aria-label="Previous month">
                <Icons.ChevronLeft size={17} />
              </button>
              <span className="month-stepper-label">{monthLabel}</span>
              <button className="ghost-btn" disabled={monthOffset === 0} onClick={() => setMonthOffset(o => Math.max(0, o - 1))} aria-label="Next month">
                <Icons.ChevronRight size={17} />
              </button>
            </div>
          )}
          <div className="seg" style={{ width: '260px', margin: 0 }}>
            <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>Week</button>
            <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')}>Month</button>
            <button className={range === 'all' ? 'on' : ''} onClick={() => { setRange('all'); setMonthOffset(0); }}>All Time</button>
          </div>
        </div>
      </header>

      {/* Mini Stats (4 cards) */}
      <div className="mini-stats" style={{ marginBottom: '24px' }}>
        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--violet)' }}>
            <Icons.Clock size={19} />
          </div>
          <div className="v">{data.current.totalHours}h</div>
          <div className="k">Focus Hours <DeltaBadge current={data.current.totalHours} previous={data.previous.totalHours} unit="h" /></div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--sky)' }}>
            <Icons.CheckSquare size={19} />
          </div>
          <div className="v">{data.current.completedTasksCount}</div>
          <div className="k">Completed Tasks <DeltaBadge current={data.current.completedTasksCount} previous={data.previous.completedTasksCount} /></div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--coral)' }}>
            <Icons.Flame size={19} />
          </div>
          <div className="v">{data.maxStreak}</div>
          <div className="k">Longest Habit Streak</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--mint)' }}>
            <Icons.FolderOpen size={19} />
          </div>
          <div className="v">{data.activeProjectsCount}</div>
          <div className="k">Active Initiatives</div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="bento">
        {/* Project Focus Donut Chart (6 columns) */}
        <FocusDistribution
          projectShares={data.projectShares}
          totalHours={data.current.totalHours}
          rangeLabel={getRangeLabel()}
        />

        {/* Project Progress meters (6 columns) */}
        <InitiativeProgress projectProgress={data.projectProgress} />

        {/* Monthly rhythm (7 columns) */}
        <div className="w span-7">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Monthly rhythm</div>
                <div className="sub">Focus hours and completed tasks, last 6 months</div>
              </div>
            </div>
            <div className="rhythm-chart">
              {data.monthly.map(m => (
                <div key={m.label} className="rhythm-col" title={`${m.label}: ${m.hours}h focus · ${m.tasks} tasks`}>
                  <span className="rhythm-val">{m.hours > 0 ? `${m.hours}h` : ''}</span>
                  <div className="steps-week-bar-track rhythm-track">
                    <motion.div
                      className="rhythm-bar"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(3, (m.hours / maxMonthlyHours) * 100)}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                    />
                  </div>
                  <span className="steps-week-day">{m.label}</span>
                  <span className="rhythm-tasks">{m.tasks} ✓</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights (5 columns) */}
        <div className="w span-5">
          <div className="card">
            <div className="card-h">
              <div>
                <div className="t">Insights</div>
                <div className="sub">Auto-read from your data</div>
              </div>
              <Icons.Sparkles size={18} style={{ color: 'var(--amber)' }} />
            </div>
            <ul className="insight-list">
              {insights.map((text, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Presence Stats (12 columns) */}
        <PresenceStats range={range} />
      </div>
    </motion.div>
  );
}
