import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';

function formatElapsedWithSmallSeconds(ms: number): React.ReactNode {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return (
    <>
      {hh}:{mm}<span style={{ fontSize: '0.6em', opacity: 0.8, fontVariantNumeric: 'tabular-nums', marginLeft: '1px' }}>:{ss}</span>
    </>
  );
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

export default function CheckInStopwatch() {
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

  const radius = 58;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius; // ~364.42

  const checkInProgress = Math.min(1.0, todayTotalMs / (8 * 60 * 60 * 1000));
  const checkInDashOffset = circumference * (1 - checkInProgress);

  return (
    <>
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
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-end',
            }}>
              {runningCheckIn ? formatElapsedWithSmallSeconds(checkInElapsed) : (
                <>
                  00:00<span style={{ fontSize: '0.6em', opacity: 0.8, fontVariantNumeric: 'tabular-nums', marginLeft: '1px' }}>:00</span>
                </>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 600 }}>
              Today: {formatDuration(todayTotalMs)}
            </div>
          </div>
        </div>
      </div>

      {/* Check-In Dial Clock Clock */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', borderTop: '1px solid var(--stroke-2)', paddingTop: '16px' }}>
        <div className="clock-ring">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle
              cx="66"
              cy="66"
              r={radius}
              stroke="var(--stroke-2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx="66"
              cy="66"
              r={radius}
              stroke="var(--coral)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={checkInDashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="clock-face">
            <div className="period" style={{ color: 'var(--coral)' }}>Logged</div>
            <div className="big" style={{ fontSize: '18px', marginTop: '4px' }}>
              {formatDuration(todayTotalMs)}
            </div>
            <div className="sec">8h Goal</div>
          </div>
        </div>
      </div>
    </>
  );
}
