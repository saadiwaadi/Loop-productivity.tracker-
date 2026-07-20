import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useConfirm } from '../../components/providers/ConfirmProvider';

interface ProjectDetailSessionsProps {
  projectId: number;
}

export default function ProjectDetailSessions({ projectId }: ProjectDetailSessionsProps) {
  const confirmDialog = useConfirm();
  
  const allTimeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];
  
  const [manualHours, setManualHours] = useState('');
  const [manualNote, setManualNote] = useState('');

  const projEntries = allTimeEntries.filter(e => e.projectId === projectId);
  const loggedHours = projEntries.reduce((sum, entry) => {
    const end = entry.endedAt ?? (entry.pausedAt ?? Date.now());
    return sum + (end - entry.startedAt) / (1000 * 60 * 60);
  }, 0);

  const formatTimeEntryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: number, end: number | null | undefined) => {
    const elapsed = (end ?? Date.now()) - start;
    const hours = elapsed / (1000 * 60 * 60);
    return `${hours.toFixed(2)}h`;
  };

  const handleManualTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = Number(manualHours);
    if (isNaN(hrs) || hrs <= 0) return;

    const ms = hrs * 60 * 60 * 1000;
    const endedAt = Date.now();
    const startedAt = endedAt - ms;

    db.timeEntries.add({
      projectId,
      startedAt,
      endedAt,
      source: 'manual',
      note: manualNote.trim() || undefined,
      createdAt: new Date(),
    });

    setManualHours('');
    setManualNote('');
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    const ok = await confirmDialog({
      title: 'Delete Focus Entry',
      message: 'Are you sure you want to delete this focus log entry?',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      db.timeEntries.delete(entryId);
    }
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 className="font-display font-bold text-xl" style={{ margin: 0 }}>Logged Focus Sessions</h3>
          <p className="text-xs text-ink-soft" style={{ marginTop: '2px' }}>Time entries logged for this project</p>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
          {loggedHours.toFixed(1)}h total
        </div>
      </div>

      {/* Inline Manual Logger */}
      <form onSubmit={handleManualTimeSubmit} style={{
        background: 'var(--input-bg)',
        border: '1px solid var(--stroke-2)',
        borderRadius: '16px',
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
        alignItems: 'center',
      }}>
        <input
          type="number"
          step="0.1"
          placeholder="Hours (e.g. 1.5)"
          value={manualHours}
          onChange={e => setManualHours(e.target.value)}
          style={{
            width: '130px',
            background: 'var(--card-solid)',
            border: '1px solid var(--stroke-2)',
            borderRadius: '10px',
            padding: '7px 10px',
            fontSize: '12.5px',
            color: 'var(--ink)',
            outline: 'none',
          }}
          required
        />
        <input
          type="text"
          placeholder="Log note (optional)..."
          value={manualNote}
          onChange={e => setManualNote(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'var(--card-solid)',
            border: '1px solid var(--stroke-2)',
            borderRadius: '10px',
            padding: '7px 10px',
            fontSize: '12.5px',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn primary" style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '12.5px', flex: 'none', height: '31px' }}>
          <Icons.Plus size={14} /> Log
        </button>
      </form>

      {/* Sessions List */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {projEntries.length === 0 ? (
          <div className="text-xs text-ink-faint italic p-6 text-center">No focus sessions logged yet. Use the stopwatch or log manual hours above!</div>
        ) : (
          [...projEntries]
            .sort((a, b) => b.startedAt - a.startedAt)
            .map(entry => (
              <div
                key={entry.id}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--stroke-2)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div className="font-semibold text-sm text-ink">
                    {formatTimeEntryDate(entry.startedAt)}
                  </div>
                  <div className="text-ink-soft text-xs mt-1">
                    {entry.source === 'manual' ? 'Manual Log' : 'Stopwatch'}
                    {entry.note ? ` • "${entry.note}"` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong className="font-display font-bold text-sm text-ink">
                    {calculateDuration(entry.startedAt, entry.endedAt)}
                  </strong>
                  {entry.id && (
                    <button
                      onClick={() => handleDeleteTimeEntry(entry.id!)}
                      className="text-ink-faint hover:text-coral transition-colors"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
