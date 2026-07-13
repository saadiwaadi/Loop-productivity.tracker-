import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../db/db';
import { useRunningTimeEntry, useProjects } from '../hooks/useDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { useConfirm } from './ConfirmProvider';
import CustomSelect from './CustomSelect';

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

export default function ActiveSession() {
  const runningEntry = useRunningTimeEntry();
  const projects = useProjects();
  const confirmDialog = useConfirm();

  const [elapsed, setElapsed] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [manualInput, setManualInput] = useState('');
  const [note, setNote] = useState('');

  const allEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === 0) {
      setSelectedProjectId(projects[0].id || 0);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!runningEntry) {
      setElapsed(0);
      return;
    }

    setElapsed(Date.now() - runningEntry.startedAt);

    const interval = setInterval(() => {
      setElapsed(Date.now() - runningEntry.startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [runningEntry]);

  const runningProject = runningEntry
    ? projects.find(p => p.id === runningEntry.projectId)
    : null;

  const renderProjectIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Folder;
    return <Icon size={20} />;
  };

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

  const handleStopTimer = () => {
    if (!runningEntry || !runningEntry.id) return;
    db.timeEntries.update(runningEntry.id, {
      endedAt: Date.now(),
    });
  };

  const handleResetTimer = async () => {
    if (!runningEntry || !runningEntry.id) return;
    const ok = await confirmDialog({
      title: 'Cancel Session',
      message: 'Are you sure you want to cancel this running session? (Time will not be logged)',
      type: 'danger',
      confirmText: 'Cancel Session',
    });
    if (ok) {
      db.timeEntries.delete(runningEntry.id);
    }
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

  // Logged today calculation for running project
  const getLoggedTodayText = () => {
    if (!runningProject || !runningProject.id) return 'Keep it steady';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayEntries = allEntries.filter(e => {
      return e.projectId === runningProject.id && e.startedAt >= startOfToday.getTime();
    });

    const totalMs = todayEntries.reduce((sum, entry) => {
      const end = entry.endedAt ?? Date.now();
      return sum + (end - entry.startedAt);
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

  return (
    <div className="session">
      {runningEntry && runningProject ? (
        <div>
          <div className="proj">
            <div
              className="proj-ic"
              style={{ backgroundColor: `var(${runningProject.colorToken})` }}
            >
              {renderProjectIcon(runningProject.icon)}
            </div>
            <div>
              <div className="nm">{runningProject.name}</div>
              <div className="tg">Active stopwatch timer</div>
            </div>
          </div>

          <div className="timer">
            {mainTime}
            <span className="ms">{secondsTime}</span>
          </div>
          <div className="timer-cap">{getLoggedTodayText()}</div>

          <div className="timer-ctrl">
            <button onClick={handleStopTimer} className="btn primary">
              <Icons.Pause fill="currentColor" size={18} /> Pause
            </button>
            <button onClick={handleResetTimer} className="btn soft" title="Cancel session">
              <Icons.RotateCcw size={18} /> Reset
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="card-h">
            <div>
              <div className="t">Stopwatch</div>
              <div className="sub">Focus on one thing today</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
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

          <button onClick={handleStartTimer} disabled={projects.length === 0} className="btn primary" style={{ width: '100%' }}>
            <Icons.Play fill="currentColor" size={18} /> Start stopwatch
          </button>
        </div>
      )}

      {/* Manual log form */}
      <form onSubmit={handleManualSubmit} className="manual">
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
