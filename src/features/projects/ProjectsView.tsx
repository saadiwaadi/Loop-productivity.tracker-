import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { useProjects, useTasks } from '../../hooks/useDb';
import { useConfirm } from '../../components/ConfirmProvider';
import CustomSelect from '../../components/CustomSelect';

export default function ProjectsView() {
  const projects = useProjects();
  const allTasks = useTasks();
  const confirmDialog = useConfirm();

  // Reactive time entries for live hours summing
  const allTimeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  // State controls
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newColorToken, setNewColorToken] = useState('--violet');
  const [newIcon, setNewIcon] = useState('Folder');
  const [newStatus, setNewStatus] = useState<'active' | 'paused' | 'shipped' | 'spec'>('active');
  const [newTargetHours, setNewTargetHours] = useState('');

  // Selected Project Details State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');

  const activeProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  // Sync details notes text on project open
  useEffect(() => {
    if (activeProject) {
      setProjectNotes(activeProject.notes || '');
    }
  }, [selectedProjectId, activeProject]);

  // Curated lists for project creation
  const colorOptions = [
    { label: 'Violet', value: '--violet' },
    { label: 'Sky', value: '--sky' },
    { label: 'Coral', value: '--coral' },
    { label: 'Mint', value: '--mint' },
    { label: 'Amber', value: '--amber' },
  ];

  const iconOptions = ['Folder', 'Code', 'PenTool', 'Globe', 'Database', 'BookOpen', 'Heart', 'Smile'];

  // Helper: Render Dynamic Lucide Icon
  const renderIcon = (iconName: string, size = 20) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Folder;
    return <IconComponent size={size} />;
  };

  // Helper: Get project metrics
  const getProjectMetrics = (projectId: number) => {
    const projTasks = allTasks.filter(t => t.projectId === projectId);
    const total = projTasks.length;
    const done = projTasks.filter(t => t.done).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const projEntries = allTimeEntries.filter(e => e.projectId === projectId);
    const hours = projEntries.reduce((sum, entry) => {
      const end = entry.endedAt ?? Date.now();
      return sum + (end - entry.startedAt) / (1000 * 60 * 60);
    }, 0);

    return {
      total,
      done,
      progress,
      hours: parseFloat(hours.toFixed(1)),
    };
  };

  // Add a new project to DB
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    db.projects.add({
      name: newName.trim(),
      colorToken: newColorToken,
      icon: newIcon,
      status: newStatus,
      targetHours: newTargetHours ? Number(newTargetHours) : undefined,
      createdAt: new Date(),
      notes: '',
    });

    // Reset Form
    setNewName('');
    setNewColorToken('--violet');
    setNewIcon('Folder');
    setNewStatus('active');
    setNewTargetHours('');
    setShowCreateModal(false);
  };

  // Add task inside project details
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    db.tasks.add({
      projectId: selectedProjectId,
      title: newTaskTitle.trim(),
      done: false,
      createdAt: new Date(),
    });

    setNewTaskTitle('');
  };

  // Toggle task complete inside project details
  const handleToggleTask = (taskId: number, currentDone: boolean) => {
    db.tasks.update(taskId, {
      done: !currentDone,
      doneAt: !currentDone ? new Date() : null,
    });
  };

  // Delete task inside project details
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

  // Update notes text with DB sync
  const handleNotesChange = (text: string) => {
    setProjectNotes(text);
    if (selectedProjectId) {
      db.projects.update(selectedProjectId, { notes: text });
    }
  };

  // Format time entry log timestamp
  const formatTimeEntryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: number, end: number | null) => {
    const elapsed = (end ?? Date.now()) - start;
    const hours = elapsed / (1000 * 60 * 60);
    return `${hours.toFixed(2)}h`;
  };

  // Delete log entry
  const handleDeleteTimeEntry = async (id: number) => {
    const ok = await confirmDialog({
      title: 'Delete Focus Entry',
      message: 'Are you sure you want to delete this focus log entry?',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      db.timeEntries.delete(id);
    }
  };

  // Render status badge style
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { background: 'color-mix(in srgb, var(--mint) 22%, transparent)', color: '#2f9e78' };
      case 'paused':
        return { background: 'color-mix(in srgb, var(--amber) 22%, transparent)', color: 'var(--amber)' };
      case 'shipped':
        return { background: 'color-mix(in srgb, var(--sky) 22%, transparent)', color: 'var(--sky)' };
      case 'spec':
      default:
        return { background: 'color-mix(in srgb, var(--violet) 22%, transparent)', color: 'var(--violet)' };
    }
  };

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* View Header */}
      <header className="top">
        <div className="hello">
          <h1>Projects</h1>
          <p>Organize, log focus, and track progress on your initiatives.</p>
        </div>
        <div className="top-right">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn primary"
            style={{ padding: '10px 20px', borderRadius: '16px' }}
          >
            <Icons.Plus size={18} /> New Project
          </button>
        </div>
      </header>

      {/* Projects Grid */}
      <div className="bento">
        {projects.length === 0 ? (
          <div className="card span-12" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Icons.FolderClosed size={48} style={{ margin: '0 auto 16px', color: 'var(--ink-faint)' }} />
            <h3 className="font-display font-black text-xl mb-2">No Projects Yet</h3>
            <p className="text-ink-soft mb-6">Create a project to start logging tasks and focus hours.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn primary" style={{ margin: '0 auto' }}>
              Create first project
            </button>
          </div>
        ) : (
          projects.map(p => {
            if (!p.id) return null;
            const metrics = getProjectMetrics(p.id);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id!)}
                className="card span-4 proj-card"
                style={{ cursor: 'pointer' }}
              >
                <div className="proj-top">
                  <div
                    className="proj-ic"
                    style={{ backgroundColor: `var(${p.colorToken})`, color: '#fff', borderRadius: '10px', padding: '8px' }}
                  >
                    {renderIcon(p.icon, 18)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-display font-bold text-base truncate">{p.name}</div>
                  </div>
                  <span className="pill uppercase tracking-wider" style={getBadgeStyle(p.status)}>
                    {p.status}
                  </span>
                </div>

                <div className="bar">
                  <i
                    style={{
                      width: `${metrics.progress}%`,
                      backgroundColor: `var(${p.colorToken})`,
                    }}
                  />
                </div>

                <div className="proj-meta">
                  <span>
                    {metrics.done}/{metrics.total} tasks
                  </span>
                  <span>
                    {metrics.hours}h logged {p.targetHours ? `/ ${p.targetHours}h` : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <button
              onClick={() => setShowCreateModal(false)}
              className="ghost-btn"
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              <Icons.X />
            </button>

            <h2 className="font-display font-black text-2xl mb-4">Create Project</h2>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. River View ERP"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--stroke-2)',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={newStatus}
                    onChange={val => setNewStatus(val as any)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'paused', label: 'Paused' },
                      { value: 'shipped', label: 'Shipped' },
                      { value: 'spec', label: 'Spec / Draft' }
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Target Hours
                  </label>
                  <input
                    type="number"
                    placeholder="Optional (e.g. 40)"
                    value={newTargetHours}
                    onChange={e => setNewTargetHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--stroke-2)',
                      color: 'var(--ink)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Color Token Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                  Theme Color
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {colorOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewColorToken(opt.value)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: `var(${opt.value})`,
                        border: newColorToken === opt.value ? '3px solid var(--ink)' : '2px solid var(--card-border)',
                        cursor: 'pointer',
                        transform: newColorToken === opt.value ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.2s',
                      }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                  Project Icon
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {iconOptions.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewIcon(ic)}
                      className="ghost-btn"
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        border: newIcon === ic ? '2px solid var(--ink)' : undefined,
                        backgroundColor: newIcon === ic ? 'var(--stroke-2)' : undefined,
                        borderRadius: '10px',
                      }}
                    >
                      {renderIcon(ic, 16)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProjectId && activeProject && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setSelectedProjectId(null)}
        >
          <div className="modal-content" style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <button
              onClick={() => setSelectedProjectId(null)}
              className="ghost-btn"
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              <Icons.X />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid var(--stroke)', paddingBottom: '16px' }}>
              <div
                className="proj-ic"
                style={{ backgroundColor: `var(${activeProject.colorToken})`, color: '#fff', padding: '10px', borderRadius: '12px' }}
              >
                {renderIcon(activeProject.icon, 24)}
              </div>
              <div>
                <h2 className="font-display font-black text-2xl">{activeProject.name}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span className="pill uppercase tracking-wider" style={getBadgeStyle(activeProject.status)}>
                    {activeProject.status}
                  </span>
                  <span className="text-xs text-ink-soft font-semibold">
                    Created {new Date(activeProject.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Content Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
              
              {/* Left Column: Tasks and Time History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Inline Task Manager */}
                <div>
                  <h3 className="font-display font-bold text-lg mb-3">Project Tasks</h3>
                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="Add project task..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
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
                    <button type="submit" className="ghost-btn" style={{ flexShrink: 0 }}>
                      <Icons.Plus />
                    </button>
                  </form>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {allTasks.filter(t => t.projectId === selectedProjectId).length === 0 ? (
                      <div className="text-xs text-ink-faint italic p-4 text-center">No tasks for this project yet.</div>
                    ) : (
                      allTasks
                        .filter(t => t.projectId === selectedProjectId)
                        .map(t => (
                          <div key={t.id} className="task" style={{ padding: '8px 4px' }}>
                            <div
                              className={`check ${t.done ? 'done' : ''}`}
                              onClick={() => t.id && handleToggleTask(t.id, t.done)}
                            >
                              <Icons.Check />
                            </div>
                            <span className="tx font-medium text-sm" style={{ textDecoration: t.done ? 'line-through' : undefined, color: t.done ? 'var(--ink-faint)' : undefined }}>
                              {t.title}
                            </span>
                            <button
                              onClick={() => t.id && handleDeleteTask(t.id)}
                              className="text-ink-faint hover:text-coral transition-colors"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                            >
                              <Icons.Trash2 size={14} />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Time Entry History */}
                <div>
                  <h3 className="font-display font-bold text-lg mb-3">Logged Focus Sessions</h3>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allTimeEntries.filter(e => e.projectId === selectedProjectId).length === 0 ? (
                      <div className="text-xs text-ink-faint italic p-4 text-center">No hours logged yet.</div>
                    ) : (
                      allTimeEntries
                        .filter(e => e.projectId === selectedProjectId)
                        .sort((a, b) => b.startedAt - a.startedAt)
                        .map(entry => (
                          <div
                            key={entry.id}
                            style={{
                              background: 'var(--input-bg)',
                              border: '1px solid var(--stroke)',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12.5px',
                            }}
                          >
                            <div>
                              <div className="font-semibold text-ink">
                                {formatTimeEntryDate(entry.startedAt)}
                              </div>
                              <div className="text-ink-soft text-[11.5px] mt-0.5">
                                {entry.source === 'manual' ? 'Manual Log' : 'Stopwatch'}
                                {entry.note ? ` • "${entry.note}"` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <strong className="font-display font-bold text-ink">
                                {calculateDuration(entry.startedAt, entry.endedAt)}
                              </strong>
                              {entry.id && (
                                <button
                                  onClick={() => handleDeleteTimeEntry(entry.id!)}
                                  className="text-ink-faint hover:text-coral transition-colors"
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                                >
                                  <Icons.Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Project-scoped Side Notes */}
              <div style={{ borderLeft: '1px solid var(--stroke)', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h3 className="font-display font-bold text-lg mb-2">Project Notes</h3>
                  <p className="text-xs text-ink-soft mb-3">Quick thoughts and reminders scoped only to this project.</p>
                  <textarea
                    placeholder="Type side notes here... (autosaved)"
                    value={projectNotes}
                    onChange={e => handleNotesChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: '240px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--stroke-2)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '13.5px',
                      color: 'var(--ink)',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Metrics */}
                {selectedProjectId && (
                  <div style={{ background: 'var(--input-bg)', padding: '14px', borderRadius: '16px', border: '1px solid var(--stroke)' }}>
                    <h4 className="font-display font-bold text-sm mb-2 text-ink-soft">Target Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-ink-soft">Target hours:</span>
                        <strong className="text-ink">{activeProject.targetHours ? `${activeProject.targetHours}h` : 'N/A'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-ink-soft">Current progress:</span>
                        <strong className="text-ink">{getProjectMetrics(activeProject.id!).progress}%</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
