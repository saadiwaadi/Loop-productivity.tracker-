import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useRunningTimeEntries, useProjects } from '../../hooks/useDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import CustomSelect from '../../components/ui/CustomSelect';

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

function parseDuration(input: string): number | null {
  const hourRegex = /(\d+(?:\.\d+)?)\s*h/i;
  const minRegex = /(\d+)\s*m/i;

  let totalMs = 0;
  let matched = false;

  const hourMatch = input.match(hourRegex);
  if (hourMatch) {
    totalMs += parseFloat(hourMatch[1]) * 60 * 60 * 1000;
    matched = true;
  }

  const minMatch = input.match(minRegex);
  if (minMatch) {
    totalMs += parseInt(minMatch[1], 10) * 60 * 1000;
    matched = true;
  }

  if (!matched && /^\d+$/.test(input.trim())) {
    totalMs += parseInt(input.trim(), 10) * 60 * 1000;
    matched = true;
  }

  return matched ? totalMs : null;
}

interface RunningTimerCardProps {
  entry: any;
  projects: any[];
  allEntries: any[];
  confirmDialog: any;
}

function RunningTimerCard({ entry, projects, allEntries, confirmDialog }: RunningTimerCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (entry.pausedAt) {
      setElapsed(entry.pausedAt - entry.startedAt);
      return;
    }

    setElapsed(Date.now() - entry.startedAt);

    const interval = setInterval(() => {
      setElapsed(Date.now() - entry.startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [entry.startedAt, entry.pausedAt]);

  const project = projects.find(p => p.id === entry.projectId);
  if (!project) return null;

  const renderProjectIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Folder;
    return <Icon size={18} />;
  };

  const handlePauseTimer = () => {
    if (!entry.id) return;
    db.timeEntries.update(entry.id, {
      pausedAt: Date.now(),
    });
  };

  const handleResumeTimer = () => {
    if (!entry.id) return;
    const now = Date.now();
    const pausedDuration = now - (entry.pausedAt ?? now);
    db.timeEntries.update(entry.id, {
      startedAt: entry.startedAt + pausedDuration,
      pausedAt: null,
    });
  };

  const handleStopTimer = () => {
    if (!entry.id) return;
    db.timeEntries.update(entry.id, {
      endedAt: entry.pausedAt ?? Date.now(),
      pausedAt: null,
    });
  };

  const handleResetTimer = async () => {
    if (!entry.id) return;
    const ok = await confirmDialog({
      title: 'Cancel Session',
      message: 'Are you sure you want to cancel this running session? (Time will not be logged)',
      type: 'danger',
      confirmText: 'Cancel Session',
    });
    if (ok) {
      db.timeEntries.delete(entry.id);
    }
  };

  const getLoggedTodayText = () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayEntries = allEntries.filter(e => {
      return e.projectId === project.id && e.startedAt >= startOfToday.getTime();
    });

    const totalMs = todayEntries.reduce((sum, e) => {
      const end = e.endedAt ?? (e.pausedAt ?? Date.now());
      return sum + (end - e.startedAt);
    }, 0);

    const totalMinutes = Math.floor(totalMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return `Logged today · ${hours}h ${mins}m`;
  };

  const timeStr = formatElapsed(elapsed);
  const parts = timeStr.split(':');
  const mainTime = `${parts[0]}:${parts[1]}`;
  const secondsTime = `:${parts[2]}`;
  const isPaused = !!entry.pausedAt;

  return (
    <div style={{
      background: 'var(--card-solid)',
      border: '1px solid var(--stroke-2)',
      borderRadius: '20px',
      padding: '14px 16px',
      marginBottom: '12px',
      position: 'relative'
    }}>
      <div className="proj" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          className="proj-ic"
          style={{ backgroundColor: `var(${project.colorToken})`, width: '36px', height: '36px', borderRadius: '10px' }}
        >
          {renderProjectIcon(project.icon)}
        </div>
        <div>
          <div className="nm" style={{ fontSize: '14.5px', fontWeight: 700 }}>{project.name}</div>
          <div className="tg" style={{ fontSize: '11px', color: isPaused ? 'var(--amber)' : 'var(--ink-faint)', fontWeight: isPaused ? 600 : 500 }}>
            {isPaused ? 'Paused' : 'Active stopwatch timer'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <div>
          <div className="timer" style={{ fontSize: '28px', textAlign: 'left', margin: '0', fontWeight: 700, opacity: isPaused ? 0.75 : 1 }}>
            {mainTime}
            <span className="ms" style={{ fontSize: '15px' }}>{secondsTime}</span>
          </div>
          <div className="timer-cap" style={{ textAlign: 'left', margin: '2px 0 0', fontSize: '11px', color: 'var(--ink-faint)' }}>
            {getLoggedTodayText()}
          </div>
        </div>

        <div className="timer-ctrl" style={{ display: 'flex', gap: '6px' }}>
          {isPaused ? (
            <button onClick={handleResumeTimer} className="btn primary" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12.5px', height: '34px', flex: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} title="Resume session">
              <Icons.Play fill="currentColor" size={13} /> Resume
            </button>
          ) : (
            <button onClick={handlePauseTimer} className="btn primary" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12.5px', height: '34px', flex: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} title="Pause session">
              <Icons.Pause fill="currentColor" size={13} /> Pause
            </button>
          )}
          <button onClick={handleStopTimer} className="btn soft" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12.5px', height: '34px', flex: 'none', color: 'var(--coral)', borderColor: 'color-mix(in srgb, var(--coral) 30%, transparent)', display: 'flex', alignItems: 'center', gap: '4px' }} title="Stop session">
            <Icons.Square fill="currentColor" size={13} /> Stop
          </button>
          <button onClick={handleResetTimer} className="btn soft" style={{ padding: '8px 10px', borderRadius: '10px', fontSize: '12.5px', height: '34px', flex: 'none' }} title="Cancel session">
            <Icons.RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActiveSession() {
  const runningEntries = useRunningTimeEntries();
  const projects = useProjects();
  const confirmDialog = useConfirm();

  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [manualInput, setManualInput] = useState('');
  const [note, setNote] = useState('');

  const allEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === 0) {
      setSelectedProjectId(projects[0].id || 0);
    }
  }, [projects, selectedProjectId]);

  const handleStartTimer = () => {
    if (selectedProjectId === 0) return;
    db.timeEntries.add({
      projectId: selectedProjectId,
      startedAt: Date.now(),
      endedAt: null,
      source: 'stopwatch',
      note: note.trim() || undefined,
    });
    setNote('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectId === 0 || !manualInput.trim()) return;

    const durationMs = parseDuration(manualInput);
    if (!durationMs) {
      confirmDialog({
        title: 'Invalid Format',
        message: 'Invalid duration format. Use "45m", "1.5h", or "1h 30m".',
        type: 'warning',
        confirmText: 'OK',
      });
      return;
    }

    const endedAt = Date.now();
    const startedAt = endedAt - durationMs;

    db.timeEntries.add({
      projectId: selectedProjectId,
      startedAt,
      endedAt,
      source: 'manual',
      note: note.trim() || 'Manual log',
    });

    setManualInput('');
    setNote('');
  };

  return (
    <div className="session" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div>
        {runningEntries.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Active Timers ({runningEntries.length})
            </div>
            {runningEntries.map(entry => (
              <RunningTimerCard
                key={entry.id}
                entry={entry}
                projects={projects}
                allEntries={allEntries}
                confirmDialog={confirmDialog}
              />
            ))}
          </div>
        )}

        <div className="card-h" style={{ marginBottom: '12px' }}>
          <div>
            <div className="t">Stopwatch</div>
            <div className="sub">Focus on multitasking projects today</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          <CustomSelect
            value={selectedProjectId}
            onChange={val => setSelectedProjectId(Number(val))}
            options={projects.length === 0 ? [
              { value: 0, label: 'No projects created' }
            ] : projects.map(p => ({
              value: p.id!,
              label: p.name
            }))}
          />

          <input
            type="text"
            placeholder="Session note (optional)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '16px',
              background: 'var(--input-bg)',
              border: '1px solid var(--stroke-2)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </div>

        <button onClick={handleStartTimer} disabled={projects.length === 0} className="btn primary" style={{ width: '100%', padding: '12px 18px', borderRadius: '16px' }}>
          <Icons.Play fill="currentColor" size={16} /> Start stopwatch
        </button>
      </div>

      {/* Manual log form */}
      <form onSubmit={handleManualSubmit} className="manual" style={{ marginTop: '16px' }}>
        <input
          type="text"
          placeholder="Log past hours (e.g. 45m, 1h 30m)..."
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          required
        />
        <button type="submit" className="ghost-btn" style={{ flexShrink: 0 }} title="Log hours">
          <Icons.Plus size={18} />
        </button>
      </form>
    </div>
  );
}
