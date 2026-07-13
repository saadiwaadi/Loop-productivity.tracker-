import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const activeSession = useLiveQuery(async () => {
    const running = await db.timeEntries.filter(e => !e.endedAt).first();
    if (running) {
      const proj = await db.projects.get(running.projectId);
      return { ...running, projectName: proj?.name || 'Unknown Project' };
    }
    return null;
  });

  const nextTask = useLiveQuery(async () => {
    const list = await db.tasks.filter(t => !t.done).toArray();
    return list[0] || null;
  });

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
            {activeSession
              ? `Timer running · ${activeSession.projectName}`
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
  );
}
