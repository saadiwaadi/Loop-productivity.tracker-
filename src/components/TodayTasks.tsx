import { useState } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../db/db';
import { useTasks, useProjects } from '../hooks/useDb';

export default function TodayTasks() {
  const tasks = useTasks();
  const projects = useProjects();

  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedProj, setSelectedProj] = useState<number>(0);

  const todoCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  const filteredTasks = tasks.filter(t => (activeTab === 'todo' ? !t.done : t.done));

  const handleToggleTask = (taskId: number, currentDone: boolean) => {
    db.tasks.update(taskId, {
      done: !currentDone,
      doneAt: !currentDone ? new Date() : null,
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    db.tasks.add({
      title: quickTitle.trim(),
      projectId: selectedProj > 0 ? selectedProj : null,
      done: false,
      createdAt: new Date(),
    });

    setQuickTitle('');
    setSelectedProj(0);
  };

  const getProjectName = (projId?: number | null) => {
    if (!projId) return 'Standalone';
    const proj = projects.find(p => p.id === projId);
    return proj ? proj.name : 'Unknown Project';
  };

  const getAvatarColor = (title: string) => {
    const colors = ['--violet', '--sky', '--coral', '--mint', '--amber'];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return `var(${colors[idx]})`;
  };

  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div>
      <div className="card-h">
        <div>
          <div className="t">{weekday}'s Tasks</div>
          <div className="sub">Focus on one at a time</div>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="seg">
        <button className={activeTab === 'todo' ? 'on' : ''} onClick={() => setActiveTab('todo')}>
          To-do · {todoCount}
        </button>
        <button className={activeTab === 'done' ? 'on' : ''} onClick={() => setActiveTab('done')}>
          Done · {doneCount}
        </button>
      </div>

      {/* Tasks List */}
      <div style={{ minHeight: '160px', maxHeight: '280px', overflowY: 'auto' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)', fontSize: '14px' }}>
            {activeTab === 'todo' ? 'All tasks complete! Time for Biscuit' : 'No tasks finished yet.'}
          </div>
        ) : (
          filteredTasks.map(t => (
            <div key={t.id} className={`task ${t.done ? 'is-done' : ''}`}>
              <div
                className={`check ${t.done ? 'done' : ''}`}
                onClick={() => t.id && handleToggleTask(t.id, t.done)}
              >
                <Icons.Check />
              </div>
              <div className="tx">
                <div className="l">{t.title}</div>
                <div className="m">{getProjectName(t.projectId)}</div>
              </div>
              <div className="avatars">
                <span style={{ backgroundColor: getAvatarColor(t.title), color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                  {t.title.trim().charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAddTask} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Add a new task..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--input-bg)',
              border: '1px solid var(--stroke-2)',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '13.5px',
              color: 'var(--ink)',
              outline: 'none',
            }}
            required
          />
          <button type="submit" className="ghost-btn" style={{ flexShrink: 0 }} title="Add task">
            <Icons.Plus size={18} />
          </button>
        </div>
        
        {projects.length > 0 && quickTitle.trim() && (
          <select
            value={selectedProj}
            onChange={e => setSelectedProj(Number(e.target.value))}
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--stroke-2)',
              borderRadius: '10px',
              padding: '6px 10px',
              fontSize: '12px',
              color: 'var(--ink-soft)',
              outline: 'none',
            }}
          >
            <option value={0}>Standalone Task</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                Link to: {p.name}
              </option>
            ))}
          </select>
        )}
      </form>
    </div>
  );
}
