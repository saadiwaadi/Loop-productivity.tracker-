import { useState } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useTasks, useProjects } from '../../hooks/useDb';
import { useConfirm } from '../providers/ConfirmProvider';

export default function TodayTasks() {
  const tasks = useTasks();
  const projects = useProjects();

  const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedProj, setSelectedProj] = useState<number>(0);
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);

  const todoCount = tasks.filter(t => !t.done && !t.crossedOff).length;
  const doneCount = tasks.filter(t => t.done && !t.crossedOff).length;

  const filteredTasks = tasks.filter(t => (activeTab === 'todo' ? !t.done : t.done));
  const visibleTasks = filteredTasks.filter(t => !t.crossedOff);
  const hiddenTasks = filteredTasks.filter(t => t.crossedOff);

  const confirmDialog = useConfirm();

  const handleToggleTask = (taskId: number, currentDone: boolean) => {
    db.tasks.update(taskId, {
      done: !currentDone,
      doneAt: !currentDone ? new Date() : null,
    });
  };

  const handleToggleCrossedOff = (taskId: number, currentCrossedOff?: boolean) => {
    db.tasks.update(taskId, {
      crossedOff: !currentCrossedOff,
    });
  };

  const handleDeleteTask = async (taskId: number) => {
    const ok = await confirmDialog({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      db.tasks.delete(taskId);
    }
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
          <>
            {/* Visible Tasks */}
            {visibleTasks.length === 0 && hiddenTasks.length > 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)', fontSize: '14px' }}>
                All visible tasks are hidden or completed.
              </div>
            ) : (
              visibleTasks.map(t => (
                <div
                  key={t.id}
                  className={`task ${t.done ? 'is-done' : ''}`}
                >
                  <div
                    className={`check ${t.done ? 'done' : ''}`}
                    onClick={() => t.id && handleToggleTask(t.id, t.done)}
                  >
                    <Icons.Check />
                  </div>
                  <div className="tx">
                    <div
                      className="l"
                      style={{
                        textDecoration: t.done ? 'line-through' : 'none',
                        color: t.done ? 'var(--ink-faint)' : 'var(--ink)'
                      }}
                    >
                      {t.title}
                    </div>
                    <div className="m">{getProjectName(t.projectId)}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
                    <button
                      type="button"
                      onClick={() => t.id && handleToggleCrossedOff(t.id, t.crossedOff)}
                      className="text-ink-faint hover:text-ink transition-colors"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Hide task"
                    >
                      <Icons.EyeOff size={15} />
                    </button>

                    {activeTab === 'done' && (
                      <button
                        type="button"
                        onClick={() => t.id && handleDeleteTask(t.id)}
                        className="text-ink-faint hover:text-coral transition-colors"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Delete task"
                      >
                        <Icons.Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="avatars">
                    <span style={{ backgroundColor: getAvatarColor(t.title), color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                      {t.title.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Hidden Tasks Collapsible */}
            {hiddenTasks.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowHiddenTasks(!showHiddenTasks)}
                  className="ghost-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    width: 'auto',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ink-soft)',
                    margin: '0 auto',
                    height: 'auto',
                  }}
                >
                  {showHiddenTasks ? <Icons.Eye size={13} /> : <Icons.EyeOff size={13} />}
                  <span>{showHiddenTasks ? 'Hide hidden tasks' : `Show hidden · ${hiddenTasks.length}`}</span>
                </button>

                {showHiddenTasks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--stroke-2)', paddingTop: '10px' }}>
                    {hiddenTasks.map(t => (
                      <div
                        key={t.id}
                        className={`task ${t.done ? 'is-done' : ''}`}
                        style={{ opacity: 0.6 }}
                      >
                        <div
                          className={`check ${t.done ? 'done' : ''}`}
                          onClick={() => t.id && handleToggleTask(t.id, t.done)}
                        >
                          <Icons.Check />
                        </div>
                        <div className="tx">
                          <div
                            className="l"
                            style={{
                              textDecoration: 'line-through',
                              color: 'var(--ink-faint)'
                            }}
                          >
                            {t.title}
                          </div>
                          <div className="m">{getProjectName(t.projectId)}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
                          <button
                            type="button"
                            onClick={() => t.id && handleToggleCrossedOff(t.id, t.crossedOff)}
                            className="text-ink-faint hover:text-ink transition-colors"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                            title="Unhide task"
                          >
                            <Icons.Eye size={15} />
                          </button>

                          {activeTab === 'done' && (
                            <button
                              type="button"
                              onClick={() => t.id && handleDeleteTask(t.id)}
                              className="text-ink-faint hover:text-coral transition-colors"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Delete task"
                            >
                              <Icons.Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div className="avatars">
                          <span style={{ backgroundColor: getAvatarColor(t.title), color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                            {t.title.trim().charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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
