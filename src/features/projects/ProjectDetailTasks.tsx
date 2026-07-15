import { useState } from 'react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import { useTasks } from '../../hooks/useDb';
import { useConfirm } from '../../components/providers/ConfirmProvider';

interface ProjectDetailTasksProps {
  projectId: number;
}

export default function ProjectDetailTasks({ projectId }: ProjectDetailTasksProps) {
  const allTasks = useTasks();
  const confirmDialog = useConfirm();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);

  const projTasks = allTasks.filter(t => t.projectId === projectId);
  const totalTasks = projTasks.length;
  const completedTasks = projTasks.filter(t => t.done).length;

  const sortedProjectTasks = [...projTasks].sort((a, b) => {
    if (a.done === b.done) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.done ? 1 : -1;
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    db.tasks.add({
      projectId,
      title: newTaskTitle.trim(),
      done: false,
      createdAt: new Date(),
    });

    setNewTaskTitle('');
  };

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

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 className="font-display font-bold text-xl" style={{ margin: 0 }}>Project Tasks</h3>
          <p className="text-xs text-ink-soft" style={{ marginTop: '2px' }}>Manage requirements and actions for this project</p>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>
          {completedTasks}/{totalTasks} complete
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="What needs to be done next?..."
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--input-bg)',
            border: '1px solid var(--stroke-2)',
            borderRadius: '14px',
            padding: '10px 14px',
            fontSize: '13.5px',
            color: 'var(--ink)',
            outline: 'none',
          }}
          required
        />
        <button type="submit" className="btn primary" style={{ padding: '10px 16px', borderRadius: '14px', flex: 'none' }}>
          <Icons.Plus size={16} /> Add Task
        </button>
      </form>

      {/* Sorted Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sortedProjectTasks.length === 0 ? (
          <div className="text-xs text-ink-faint italic p-6 text-center">No tasks created yet. Write one above to plan your work.</div>
        ) : (
          <>
            {/* Visible Tasks */}
            {sortedProjectTasks.filter(t => !t.crossedOff).length === 0 && sortedProjectTasks.filter(t => t.crossedOff).length > 0 ? (
              <div className="text-xs text-ink-faint italic p-6 text-center">All visible tasks are hidden or completed.</div>
            ) : (
              sortedProjectTasks.filter(t => !t.crossedOff).map(t => (
                <div
                  key={t.id}
                  className="task"
                  style={{
                    padding: '10px 12px',
                    background: t.done ? 'color-mix(in srgb, var(--input-bg) 60%, transparent)' : 'var(--input-bg)',
                    border: '1px solid var(--stroke-2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    className={`check ${t.done ? 'done' : ''}`}
                    onClick={() => t.id && handleToggleTask(t.id, t.done)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icons.Check size={12} style={{ strokeWidth: 3 }} />
                  </div>
                  <span
                    className="tx font-medium text-sm"
                    style={{
                      flex: 1,
                      textDecoration: t.done ? 'line-through' : undefined,
                      color: t.done ? 'var(--ink-faint)' : 'var(--ink)',
                    }}
                  >
                    {t.title}
                  </span>
                  
                  <button
                    onClick={() => t.id && handleToggleCrossedOff(t.id, t.crossedOff)}
                    className="text-ink-faint hover:text-ink transition-colors"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title="Hide task"
                  >
                    <Icons.EyeOff size={14} />
                  </button>

                  {t.done && (
                    <button
                      onClick={() => t.id && handleDeleteTask(t.id)}
                      className="text-ink-faint hover:text-coral transition-colors"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Delete task"
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}

            {/* Hidden Tasks Collapsible */}
            {sortedProjectTasks.filter(t => t.crossedOff).length > 0 && (
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
                  <span>{showHiddenTasks ? 'Hide hidden tasks' : `Show hidden · ${sortedProjectTasks.filter(t => t.crossedOff).length}`}</span>
                </button>

                {showHiddenTasks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--stroke-2)', paddingTop: '10px' }}>
                    {sortedProjectTasks.filter(t => t.crossedOff).map(t => (
                      <div
                        key={t.id}
                        className="task"
                        style={{
                          padding: '10px 12px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--stroke-2)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: 0.6,
                        }}
                      >
                        <div
                          className={`check ${t.done ? 'done' : ''}`}
                          onClick={() => t.id && handleToggleTask(t.id, t.done)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Icons.Check size={12} style={{ strokeWidth: 3 }} />
                        </div>
                        <span
                          className="tx font-medium text-sm"
                          style={{
                            flex: 1,
                            textDecoration: 'line-through',
                            color: 'var(--ink-faint)',
                          }}
                        >
                          {t.title}
                        </span>
                        
                        <button
                          onClick={() => t.id && handleToggleCrossedOff(t.id, t.crossedOff)}
                          className="text-ink-faint hover:text-ink transition-colors"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          title="Unhide task"
                        >
                          <Icons.Eye size={14} />
                        </button>

                        {t.done && (
                          <button
                            onClick={() => t.id && handleDeleteTask(t.id)}
                            className="text-ink-faint hover:text-coral transition-colors"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                            title="Delete task"
                          >
                            <Icons.Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
