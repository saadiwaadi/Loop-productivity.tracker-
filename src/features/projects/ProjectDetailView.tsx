import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { useTasks } from '../../hooks/useDb';
import { useConfirm } from '../../components/ConfirmProvider';
import CustomSelect from '../../components/CustomSelect';

const colorOptions = [
  { label: 'Violet', value: '--violet' },
  { label: 'Sky', value: '--sky' },
  { label: 'Coral', value: '--coral' },
  { label: 'Mint', value: '--mint' },
  { label: 'Amber', value: '--amber' },
];

const iconOptions = [
  'Folder', 'Code', 'Palette', 'BookOpen', 'Video', 
  'Music', 'Globe', 'Compass', 'Terminal', 'Heart', 
  'Star', 'CheckSquare', 'Layers', 'Briefcase', 'Coffee',
  'Gamepad2'
];

export default function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();
  const projectId = Number(id);

  // DB queries
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const allTasks = useTasks();
  const allTimeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused' | 'shipped' | 'spec'>('active');
  const [editColorToken, setEditColorToken] = useState('--violet');
  const [editIcon, setEditIcon] = useState('Folder');
  const [editGoalType, setEditGoalType] = useState<'hours' | 'tasks' | 'manual'>('hours');
  const [editTargetHours, setEditTargetHours] = useState('');
  const [editTargetTasks, setEditTargetTasks] = useState('');
  const [editManualProgress, setEditManualProgress] = useState(0);

  // Interaction forms state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Sync state when project loads
  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditStatus(project.status);
      setEditColorToken(project.colorToken);
      setEditIcon(project.icon);
      setEditGoalType(project.goalType || 'hours');
      setEditTargetHours(project.targetHours ? String(project.targetHours) : '');
      setEditTargetTasks(project.targetTasks ? String(project.targetTasks) : '');
      setEditManualProgress(project.manualProgress ?? 0);
      setProjectNotes(project.notes || '');
    }
  }, [project]);

  if (!project) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-soft)' }}>
        <h2 className="font-display font-bold text-2xl">Project not found</h2>
        <button onClick={() => navigate('/projects')} className="btn primary" style={{ margin: '20px auto 0' }}>
          Back to Projects
        </button>
      </div>
    );
  }

  // Helpers
  const renderIcon = (iconName: string, size = 20) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Folder;
    return <IconComponent size={size} />;
  };

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

  // Metrics
  const projTasks = allTasks.filter(t => t.projectId === projectId);
  const totalTasks = projTasks.length;
  const completedTasks = projTasks.filter(t => t.done).length;

  const projEntries = allTimeEntries.filter(e => e.projectId === projectId);
  const loggedHours = projEntries.reduce((sum, entry) => {
    const end = entry.endedAt ?? Date.now();
    return sum + (end - entry.startedAt) / (1000 * 60 * 60);
  }, 0);

  // Compute progress based on goalType
  let calculatedProgress = 0;
  if (editGoalType === 'hours') {
    const target = project.targetHours || 0;
    calculatedProgress = target > 0 ? Math.round(Math.min(100, (loggedHours / target) * 100)) : 0;
  } else if (editGoalType === 'tasks') {
    const target = project.targetTasks || 0;
    if (target > 0) {
      calculatedProgress = Math.round(Math.min(100, (completedTasks / target) * 100));
    } else {
      calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }
  } else if (editGoalType === 'manual') {
    calculatedProgress = project.manualProgress ?? 0;
  }

  // Sorted tasks (incomplete top, completed bottom)
  const sortedProjectTasks = [...projTasks].sort((a, b) => {
    if (a.done === b.done) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.done ? 1 : -1;
  });

  // Action handlers
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    await db.projects.update(projectId, {
      name: editName.trim(),
      status: editStatus,
      colorToken: editColorToken,
      icon: editIcon,
      goalType: editGoalType,
      targetHours: editTargetHours ? Number(editTargetHours) : undefined,
      targetTasks: editTargetTasks ? Number(editTargetTasks) : undefined,
      manualProgress: editGoalType === 'manual' ? editManualProgress : undefined,
      updatedAt: new Date(),
    });

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleDeleteProject = async () => {
    const ok = await confirmDialog({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.name}"? This deletes all associated tasks and focus hours.`,
      type: 'danger',
      confirmText: 'Delete Project',
    });
    if (ok) {
      await db.projects.delete(projectId);
      // Clean up project entries & tasks
      const entries = await db.timeEntries.where('projectId').equals(projectId).toArray();
      await db.timeEntries.bulkDelete(entries.map(e => e.id!));
      const tasks = await db.tasks.where('projectId').equals(projectId).toArray();
      await db.tasks.bulkDelete(tasks.map(t => t.id!));
      navigate('/projects');
    }
  };

  const handleNotesChange = (text: string) => {
    setProjectNotes(text);
    db.projects.update(projectId, { notes: text });
  };

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
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 8px 30px' }}
    >
      {/* Back navigation header */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/projects')}
          className="ghost-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: 600 }}
        >
          <Icons.ArrowLeft size={16} />
          <span>Back to Projects</span>
        </button>
      </div>

      {/* Main header block */}
      <header className="top" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            className="proj-ic"
            style={{ backgroundColor: `var(${project.colorToken})`, color: '#fff', padding: '12px', borderRadius: '16px' }}
          >
            {renderIcon(project.icon, 28)}
          </div>
          <div>
            <h1 style={{ fontSize: '32px', lineHeight: 1.1, margin: 0 }}>{project.name}</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <span className="pill uppercase tracking-wider" style={getBadgeStyle(project.status)}>
                {project.status}
              </span>
              <span className="text-xs text-ink-soft font-semibold">
                Goal: {project.goalType === 'tasks' ? 'Tasks' : project.goalType === 'manual' ? 'Manual Progress' : 'Hours'}
              </span>
              <span className="text-xs text-ink-faint">•</span>
              <span className="text-xs text-ink-soft font-semibold">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Layout (Two Column layout: 1.3fr and 0.7fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: Sessions and Tasks (Sessions FIRST, Tasks BELOW) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* LOGGED FOCUS SESSIONS (UPPER SECTION) */}
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

          {/* PROJECT TASKS (BELOW SECTION) */}
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
                sortedProjectTasks.map(t => (
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

        </div>

        {/* RIGHT COLUMN: Notes and Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PROJECT NOTES CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 className="font-display font-bold text-lg mb-2">Project Notes</h3>
            <p className="text-xs text-ink-soft mb-3">Quick thoughts, reference links, and reminders (autosaved).</p>
            <textarea
              placeholder="Type side notes here..."
              value={projectNotes}
              onChange={e => handleNotesChange(e.target.value)}
              style={{
                width: '100%',
                height: '180px',
                background: 'var(--input-bg)',
                border: '1px solid var(--stroke-2)',
                borderRadius: '16px',
                padding: '12px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '13.5px',
                color: 'var(--ink)',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* PROJECT CONFIGURATION / GOALS EDIT CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 className="font-display font-bold text-lg mb-3">Goal &amp; Settings</h3>
            
            <form onSubmit={handleUpdateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--stroke-2)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Status
                  </label>
                  <CustomSelect
                    value={editStatus}
                    onChange={val => setEditStatus(val as any)}
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
                    Goal Type
                  </label>
                  <CustomSelect
                    value={editGoalType}
                    onChange={val => setEditGoalType(val as any)}
                    options={[
                      { value: 'hours', label: 'Hours' },
                      { value: 'tasks', label: 'Tasks' },
                      { value: 'manual', label: 'Manual %' }
                    ]}
                  />
                </div>
              </div>

              {/* Conditional Goal Inputs */}
              {editGoalType === 'hours' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Target Hours
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={editTargetHours}
                    onChange={e => setEditTargetHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--stroke-2)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {editGoalType === 'tasks' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Target Completed Tasks
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={editTargetTasks}
                    onChange={e => setEditTargetTasks(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--stroke-2)',
                      color: 'var(--ink)',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {editGoalType === 'manual' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
                      Manual Progress
                    </label>
                    <span className="text-xs font-bold text-ink">{editManualProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={editManualProgress}
                    onChange={e => setEditManualProgress(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--accent-deep)',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}

              {/* Theme Color Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                  Theme Color
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {colorOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditColorToken(opt.value)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: `var(${opt.value})`,
                        border: editColorToken === opt.value ? '2.5px solid var(--ink)' : '1px solid var(--card-border)',
                        cursor: 'pointer',
                        transform: editColorToken === opt.value ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.2s',
                      }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              {/* Project Icon Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-2">
                  Project Icon
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                  {iconOptions.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditIcon(ic)}
                      className="ghost-btn"
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        border: editIcon === ic ? '1.5px solid var(--ink)' : undefined,
                        backgroundColor: editIcon === ic ? 'var(--stroke-2)' : undefined,
                        borderRadius: '8px',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {renderIcon(ic, 14)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Summary Info */}
              <div style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--stroke-2)',
                borderRadius: '14px',
                padding: '10px 12px',
                fontSize: '12.5px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-ink-soft">Current Progress:</span>
                  <span className="text-ink font-bold">{calculatedProgress}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--stroke-2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${calculatedProgress}%`, height: '100%', backgroundColor: `var(${project.colorToken})` }}></div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  className="btn primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '12px' }}
                >
                  {saveFeedback ? 'Changes Saved!' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="btn soft"
                  style={{ padding: '10px', color: 'var(--coral)', borderColor: 'color-mix(in srgb, var(--coral) 30%, var(--stroke-2))', borderRadius: '12px' }}
                  title="Delete Project"
                >
                  <Icons.Trash2 size={16} />
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </motion.div>
  );
}
