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

export default function AnalyzerView() {
  const [range, setRange] = useState<FilterRange>('month');

  const analyzerData = useLiveQuery(async () => {
    const projects = await db.projects.toArray();
    const tasks = await db.tasks.toArray();
    const habits = await db.habits.toArray();
    const habitLogs = await db.habitLogs.toArray();
    const timeEntries = await db.timeEntries.toArray();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const matchesRange = (date: Date) => {
      if (range === 'month') {
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }
      if (range === 'week') {
        return date.getTime() >= sevenDaysAgo;
      }
      return true; // 'all'
    };

    // 1. Total focus hours (merged/non-overlapping)
    const rangeEntries = timeEntries.filter(e => matchesRange(new Date(e.startedAt)));
    const intervals = rangeEntries.map(e => ({
      start: e.startedAt,
      end: e.endedAt ?? (e.pausedAt ?? Date.now()),
    }));
    const mergedIntervals = mergeIntervals(intervals);
    const totalHours = mergedIntervals.reduce((sum, int) => {
      return sum + (int.end - int.start) / (1000 * 60 * 60);
    }, 0);

    // 2. Tasks completed
    const completedTasks = tasks.filter(t => t.done && t.doneAt && matchesRange(new Date(t.doneAt)));

    // 3. Longest current habit streak (forced to days)
    const activeHabits = habits.filter(h => h.archivedAt === null || h.archivedAt === undefined);
    let maxStreakVal = 0;

    activeHabits.forEach(h => {
      const logs = habitLogs.filter(l => l.habitId === h.id);
      const completedDates = new Set(logs.map(l => l.date));
      const streak = calculateHabitStreak(7, completedDates, now);

      if (streak > maxStreakVal) {
        maxStreakVal = streak;
      }
    });

    const maxStreak = `${maxStreakVal}d`;

    // 4. Count of active projects
    const activeProjects = projects.filter(p => p.status === 'active');

    // Pie chart shares
    const projectShares = projects.map(p => {
      const projEntries = rangeEntries.filter(e => e.projectId === p.id);
      const hours = projEntries.reduce((sum, entry) => {
        const end = entry.endedAt ?? (entry.pausedAt ?? Date.now());
        return sum + (end - entry.startedAt) / (1000 * 60 * 60);
      }, 0);

      return {
        id: p.id,
        name: p.name,
        value: parseFloat(hours.toFixed(1)),
        colorToken: p.colorToken,
      };
    }).filter(p => p.value > 0);

    // Active project progress list
    const projectProgress = activeProjects.map(p => {
      const projTasks = tasks.filter(t => t.projectId === p.id);
      const total = projTasks.length;
      const done = projTasks.filter(t => t.done).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        colorToken: p.colorToken,
        progress,
      };
    }).sort((a, b) => b.progress - a.progress);

    return {
      totalHours: parseFloat(totalHours.toFixed(1)),
      completedTasksCount: completedTasks.length,
      maxStreak,
      activeProjectsCount: activeProjects.length,
      projectShares,
      projectProgress,
    };
  }, [range]) || {
    totalHours: 0,
    completedTasksCount: 0,
    maxStreak: '0d',
    activeProjectsCount: 0,
    projectShares: [],
    projectProgress: [],
  };

  const monthName = new Date().toLocaleString('en-US', { month: 'long' });

  const getRangeLabel = () => {
    if (range === 'month') return `This Month (${monthName})`;
    if (range === 'week') return 'Last 7 Days';
    return 'All Time';
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
          <h1>Analyzer</h1>
          <p>Visual analytics and productivity indicators for {getRangeLabel()}.</p>
        </div>
        <div className="top-right">
          {/* Segmented Filter */}
          <div className="seg" style={{ width: '280px', margin: 0 }}>
            <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>
              Week
            </button>
            <button className={range === 'month' ? 'on' : ''} onClick={() => setRange('month')}>
              Month
            </button>
            <button className={range === 'all' ? 'on' : ''} onClick={() => setRange('all')}>
              All Time
            </button>
          </div>
        </div>
      </header>

      {/* Mini Stats (4 cards) */}
      <div className="mini-stats" style={{ marginBottom: '24px' }}>
        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--violet)' }}>
            <Icons.Clock size={19} />
          </div>
          <div className="v">{analyzerData.totalHours}h</div>
          <div className="k">Focus Hours ({range === 'month' ? monthName : range === 'week' ? 'Week' : 'All'})</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--sky)' }}>
            <Icons.CheckSquare size={19} />
          </div>
          <div className="v">{analyzerData.completedTasksCount}</div>
          <div className="k">Completed Tasks ({range === 'month' ? monthName : range === 'week' ? 'Week' : 'All'})</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--coral)' }}>
            <Icons.Flame size={19} />
          </div>
          <div className="v">{analyzerData.maxStreak}</div>
          <div className="k">Longest Habit Streak</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--mint)' }}>
            <Icons.FolderOpen size={19} />
          </div>
          <div className="v">{analyzerData.activeProjectsCount}</div>
          <div className="k">Active Initiatives</div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="bento">
        {/* Project Focus Donut Chart (6 columns) */}
        <FocusDistribution
          projectShares={analyzerData.projectShares}
          totalHours={analyzerData.totalHours}
          rangeLabel={getRangeLabel()}
        />

        {/* Project Progress meters (6 columns) */}
        <InitiativeProgress projectProgress={analyzerData.projectProgress} />

        {/* Presence Stats (12 columns) */}
        <PresenceStats range={range} />
      </div>
    </motion.div>
  );
}
