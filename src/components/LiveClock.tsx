import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../db/db';

function formatElapsed(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const activeSessions = useLiveQuery(async () => {
    const running = await db.timeEntries.filter(e => !e.endedAt).toArray();
    const projects = await db.projects.toArray();
    return running.map(r => {
      const proj = projects.find(p => p.id === r.projectId);
      return { ...r, projectName: proj?.name || 'Unknown Project' };
    });
  }) || [];

  const nextTask = useLiveQuery(async () => {
    const list = await db.tasks.filter(t => !t.done).toArray();
    return list[0] || null;
  });

  // --- CHECK-IN PRESENCE STOPWATCH ---
  const runningCheckIn = useLiveQuery(() => {
    return db.checkIns.filter(c => c.endedAt === null).first();
  });

  const startOfTodayTime = new Date();
  startOfTodayTime.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfTodayTime.getTime();

  const completedCheckInsToday = useLiveQuery(async () => {
    const list = await db.checkIns
      .where('startedAt')
      .aboveOrEqual(startOfTodayMs)
      .toArray();
    return list.filter(c => c.endedAt !== null);
  }) || [];

  const [checkInElapsed, setCheckInElapsed] = useState(0);

  useEffect(() => {
    if (!runningCheckIn) {
      setCheckInElapsed(0);
      return;
    }

    setCheckInElapsed(Date.now() - runningCheckIn.startedAt);

    const interval = setInterval(() => {
      setCheckInElapsed(Date.now() - runningCheckIn.startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [runningCheckIn]);

  const completedTotalMs = completedCheckInsToday.reduce((sum, c) => {
    return sum + (c.endedAt! - c.startedAt);
  }, 0);

  const todayTotalMs = completedTotalMs + (runningCheckIn ? checkInElapsed : 0);

  const handleCheckIn = () => {
    db.checkIns.add({
      startedAt: Date.now(),
      endedAt: null,
      createdAt: new Date(),
    });
  };

  const handleCheckOut = async () => {
    if (!runningCheckIn || !runningCheckIn.id) return;
    await db.checkIns.update(runningCheckIn.id, {
      endedAt: Date.now(),
    });
  };

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();

  // 12-hour formatting
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = String(hours % 12 || 12).padStart(2, '0');
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = `:${String(seconds).padStart(2, '0')}`;

  // Date formatting matching Wed, 11 May
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateString = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;

  const radius = 58;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius; // ~364.42
  const progress = (seconds + ms / 1000) / 60;
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div className="clock-w">
        <div className="clock-ring">
          <svg width="132" height="132" viewBox="0 0 132 132">
            {/* Background Ring */}
            <circle
              cx="66"
              cy="66"
              r={radius}
              stroke="var(--stroke-2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Foreground Ring */}
            <circle
              cx="66"
              cy="66"
              r={radius}
              stroke="var(--accent)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="clock-face">
            <div className="period">{period}</div>
            <div className="big">
              {displayHours}:{displayMinutes}
            </div>
            <div className="sec">{displaySeconds}</div>
          </div>
        </div>

        <div className="clock-info">
          <div className="date">{dateString}</div>
          <div className="meta">
            <span className="pulse"></span>
            <span>
              {activeSessions.length > 0
                ? `Timers running (${activeSessions.length}) · ${activeSessions.map(s => s.projectName).join(', ')}`
                : 'No active session'}
            </span>
            {nextTask ? (
              <>
                <br />
                <span>Next: {nextTask.title}</span>
              </>
            ) : (
              <>
                <br />
                <span>Next: Chill</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Check-In stopwatch panel */}
      <div style={{ borderTop: '1px solid var(--stroke-2)', marginTop: '16px', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {runningCheckIn ? (
            <button
              onClick={handleCheckOut}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '16px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: 'var(--coral)',
                color: 'white',
                flex: 'none',
                height: '42px',
              }}
            >
              <Icons.LogOut size={15} style={{ strokeWidth: 2.5 }} />
              <span>Check out</span>
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className="btn primary"
              style={{
                padding: '10px 18px',
                borderRadius: '16px',
                fontSize: '13.5px',
                fontWeight: 700,
                flex: 'none',
                height: '42px',
              }}
            >
              <Icons.LogIn size={15} style={{ strokeWidth: 2.5 }} />
              <span>Check in</span>
            </button>
          )}

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16.5px',
              color: runningCheckIn ? 'var(--coral)' : 'var(--ink-soft)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.01em',
            }}>
              {runningCheckIn ? formatElapsed(checkInElapsed) : '00:00:00'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 600 }}>
              Today: {formatDuration(todayTotalMs)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
