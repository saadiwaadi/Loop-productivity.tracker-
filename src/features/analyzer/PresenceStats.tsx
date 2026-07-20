import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import Card from '../../components/ui/Card';

interface PresenceStatsProps {
  range: 'week' | 'month' | 'all';
}

function formatDuration(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function PresenceStats({ range }: PresenceStatsProps) {
  const checkIns = useLiveQuery(() => db.checkIns.toArray()) || [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const matchesRange = (timestamp: number) => {
    const date = new Date(timestamp);
    if (range === 'month') {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
    if (range === 'week') {
      return timestamp >= sevenDaysAgo;
    }
    return true; // 'all'
  };

  const filtered = checkIns.filter(c => matchesRange(c.startedAt));

  // Compute metrics
  const totalDurationMs = filtered.reduce((sum, c) => {
    const end = c.endedAt ?? Date.now();
    return sum + (end - c.startedAt);
  }, 0);

  const activeCheckIn = checkIns.find(c => c.endedAt === null);
  const totalSessions = filtered.length;

  // Calculate unique days with check-ins in the filtered list
  const uniqueDays = new Set(filtered.map(c => new Date(c.startedAt).toDateString())).size;
  const averageDailyMs = uniqueDays > 0 ? totalDurationMs / uniqueDays : 0;

  return (
    <Card className="span-12" style={{ padding: '24px' }}>
      <div className="card-h" style={{ marginBottom: '20px' }}>
        <div>
          <div className="t">Presence &amp; Check-ins</div>
          <div className="sub">Analytics on your checked-in focused working hours</div>
        </div>
      </div>

      {/* Reuses the same .mini-stats/.ms pattern as the stat cards above —
          the previous ad hoc repeat(4, 1fr) grid had no mobile collapse and
          no min-width:0 on its label rows, so on narrow screens it got
          clipped by the card instead of shrinking or stacking. */}
      <div className="mini-stats">
        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--sky)' }}>
            <Icons.LogIn size={16} />
          </div>
          <div className="v" style={{ fontSize: '16px', color: activeCheckIn ? 'var(--mint)' : 'var(--ink)' }}>
            {activeCheckIn ? 'Checked In' : 'Checked Out'}
          </div>
          <div className="k">Presence Status</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--violet)' }}>
            <Icons.Clock size={16} />
          </div>
          <div className="v" style={{ fontSize: '18px' }}>{formatDuration(totalDurationMs)}</div>
          <div className="k">Total Checked In Time</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--coral)' }}>
            <Icons.Flame size={16} />
          </div>
          <div className="v" style={{ fontSize: '18px' }}>{totalSessions}</div>
          <div className="k">Total Sessions</div>
        </div>

        <div className="ms">
          <div className="ic" style={{ backgroundColor: 'var(--mint)' }}>
            <Icons.Calendar size={16} />
          </div>
          <div className="v" style={{ fontSize: '18px' }}>{formatDuration(averageDailyMs)}</div>
          <div className="k">Daily Average</div>
        </div>
      </div>
    </Card>
  );
}
