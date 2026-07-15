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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--stroke-2)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-soft)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            <Icons.LogIn size={14} />
            <span>Presence Status</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: activeCheckIn ? 'var(--mint)' : 'var(--ink-soft)' }}>
            {activeCheckIn ? 'Currently Checked In' : 'Checked Out'}
          </div>
        </div>

        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--stroke-2)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-soft)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            <Icons.Clock size={14} />
            <span>Total Checked In Time</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            {formatDuration(totalDurationMs)}
          </div>
        </div>

        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--stroke-2)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-soft)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            <Icons.Flame size={14} />
            <span>Total Sessions</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            {totalSessions} check-ins
          </div>
        </div>

        <div style={{ background: 'var(--input-bg)', border: '1px solid var(--stroke-2)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-soft)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            <Icons.Calendar size={14} />
            <span>Daily Average</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
            {formatDuration(averageDailyMs)}/day
          </div>
        </div>
      </div>
    </Card>
  );
}
