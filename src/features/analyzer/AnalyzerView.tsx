import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import Card from '../../components/Card';

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

    // 1. Total focus hours
    const rangeEntries = timeEntries.filter(e => matchesRange(new Date(e.startedAt)));
    const totalHours = rangeEntries.reduce((sum, entry) => {
      const end = entry.endedAt ?? Date.now();
      return sum + (end - entry.startedAt) / (1000 * 60 * 60);
    }, 0);

    // 2. Tasks completed
    const completedTasks = tasks.filter(t => t.done && t.doneAt && matchesRange(new Date(t.doneAt)));

    // 3. Longest current habit streak
    const getDateString = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const activeHabits = habits.filter(h => h.archivedAt === null || h.archivedAt === undefined);
    let maxStreak = 0;

    activeHabits.forEach(h => {
      const logs = habitLogs.filter(l => l.habitId === h.id);
      const completedDates = new Set(logs.map(l => l.date));
      const target = h.targetDaysPerWeek;

      const checkPaceAtDate = (baseDate: Date) => {
        let count = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(baseDate);
          d.setDate(baseDate.getDate() - i);
          if (completedDates.has(getDateString(d))) {
            count++;
          }
        }
        return count >= target;
      };

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let streak = 0;
      let currentCheckedDate = new Date(today);

      if (checkPaceAtDate(today)) {
        streak = 1;
        currentCheckedDate = today;
      } else if (checkPaceAtDate(yesterday)) {
        streak = 1;
        currentCheckedDate = yesterday;
      }

      if (streak > 0) {
        while (true) {
          const nextDate = new Date(currentCheckedDate);
          nextDate.setDate(currentCheckedDate.getDate() - 1);
          if (checkPaceAtDate(nextDate)) {
            streak++;
            currentCheckedDate = nextDate;
          } else {
            break;
          }
        }
      }

      if (streak > maxStreak) {
        maxStreak = streak;
      }
    });

    // 4. Count of active projects
    const activeProjects = projects.filter(p => p.status === 'active');

    // Pie chart shares
    const projectShares = projects.map(p => {
      const projEntries = rangeEntries.filter(e => e.projectId === p.id);
      const hours = projEntries.reduce((sum, entry) => {
        const end = entry.endedAt ?? Date.now();
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
    maxStreak: 0,
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
          <div className="v">{analyzerData.maxStreak}d</div>
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
        <Card className="span-6" style={{ padding: '24px' }}>
          <div className="card-h" style={{ marginBottom: '20px' }}>
            <div>
              <div className="t">Focus Distribution</div>
              <div className="sub">Logged hours by project for {getRangeLabel().toLowerCase()}</div>
            </div>
          </div>

          {analyzerData.projectShares.length === 0 ? (
            <div
              style={{
                height: '180px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink-faint)',
                fontSize: '14px',
              }}
            >
              No hours logged in this range. Start a session!
            </div>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyzerData.projectShares}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analyzerData.projectShares.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`var(${entry.colorToken})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <b>
                  <span className="n">{analyzerData.totalHours}h</span>
                  <span className="l">Total Focus</span>
                </b>
              </div>

              {/* Accessible Legend */}
              <div className="donut-legend">
                {analyzerData.projectShares.map(p => (
                  <div key={p.id} className="dl">
                    <i style={{ backgroundColor: `var(${p.colorToken})` }} />
                    <span className="nm">{p.name}</span>
                    <span className="vv">{p.value}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Project Progress meters (6 columns) */}
        <Card className="span-6" style={{ padding: '24px' }}>
          <div className="card-h" style={{ marginBottom: '20px' }}>
            <div>
              <div className="t">Initiative Progress</div>
              <div className="sub">Active project task completion, sorted by progress</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {analyzerData.projectProgress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-faint)', fontSize: '14px' }}>
                No active projects found.
              </div>
            ) : (
              analyzerData.projectProgress.map(p => (
                <div key={p.id} className="proj-card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: `var(${p.colorToken})`,
                        }}
                      />
                      <span>{p.name}</span>
                    </div>
                    <span className="text-ink-soft">{p.progress}%</span>
                  </div>

                  <div className="bar" style={{ margin: '8px 0 0' }}>
                    <i
                      style={{
                        width: `${p.progress}%`,
                        backgroundColor: `var(${p.colorToken})`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
