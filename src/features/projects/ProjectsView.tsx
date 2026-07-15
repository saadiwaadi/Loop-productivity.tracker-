import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { useProjects, useTasks } from '../../hooks/useDb';
import CustomSelect from '../../components/CustomSelect';

export default function ProjectsView() {
  const projects = useProjects();
  const allTasks = useTasks();
  const navigate = useNavigate();

  // Reactive time entries for live hours summing
  const allTimeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  // State controls
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newColorToken, setNewColorToken] = useState('--violet');
  const [newIcon, setNewIcon] = useState('Folder');
  const [newStatus, setNewStatus] = useState<'active' | 'paused' | 'shipped' | 'spec'>('active');
  const [newGoalType, setNewGoalType] = useState<'hours' | 'tasks' | 'manual'>('hours');
  const [newTargetHours, setNewTargetHours] = useState('');
  const [newTargetTasks, setNewTargetTasks] = useState('');
  const [newManualProgress, setNewManualProgress] = useState(0);

  // Curated lists for project creation
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

    const projEntries = allTimeEntries.filter(e => e.projectId === projectId);
    const hours = projEntries.reduce((sum, entry) => {
      const end = entry.endedAt ?? Date.now();
      return sum + (end - entry.startedAt) / (1000 * 60 * 60);
    }, 0);

    const project = projects.find(p => p.id === projectId);
    const goalType = project?.goalType || 'hours';

    let progress = 0;
    if (goalType === 'hours') {
      const target = project?.targetHours || 0;
      progress = target > 0 ? Math.round(Math.min(100, (hours / target) * 100)) : 0;
    } else if (goalType === 'tasks') {
      const target = project?.targetTasks || 0;
      if (target > 0) {
        progress = Math.round(Math.min(100, (done / target) * 100));
      } else {
        progress = total > 0 ? Math.round((done / total) * 100) : 0;
      }
    } else if (goalType === 'manual') {
      progress = project?.manualProgress ?? 0;
    }

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
      goalType: newGoalType,
      targetHours: newGoalType === 'hours' && newTargetHours ? Number(newTargetHours) : undefined,
      targetTasks: newGoalType === 'tasks' && newTargetTasks ? Number(newTargetTasks) : undefined,
      manualProgress: newGoalType === 'manual' ? newManualProgress : undefined,
      createdAt: new Date(),
      notes: '',
    });

    // Reset Form
    setNewName('');
    setNewColorToken('--violet');
    setNewIcon('Folder');
    setNewStatus('active');
    setNewGoalType('hours');
    setNewTargetHours('');
    setNewTargetTasks('');
    setNewManualProgress(0);
    setShowCreateModal(false);
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
            <h3 className="font-display font-bold text-xl mb-2">No Projects Yet</h3>
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
                onClick={() => navigate(`/projects/${p.id}`)}
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
                    {metrics.done}/{p.goalType === 'tasks' && p.targetTasks ? p.targetTasks : metrics.total} tasks
                  </span>
                  <span>
                    {p.goalType === 'manual' ? (
                      `Progress: ${p.manualProgress ?? 0}%`
                    ) : (
                      `${metrics.hours}h logged ${p.targetHours ? `/ ${p.targetHours}h` : ''}`
                    )}
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

            <h2 className="font-display font-bold text-2xl mb-4">Create Project</h2>

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
                    onChange={(val: string | number) => setNewStatus(val as any)}
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
                    value={newGoalType}
                    onChange={(val: string | number) => setNewGoalType(val as any)}
                    options={[
                      { value: 'hours', label: 'Hours Goal' },
                      { value: 'tasks', label: 'Tasks Goal' },
                      { value: 'manual', label: 'Manual Progress' }
                    ]}
                  />
                </div>
              </div>

              {/* Conditional Goal Input */}
              {newGoalType === 'hours' && (
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
              )}

              {newGoalType === 'tasks' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1">
                    Target Tasks Count
                  </label>
                  <input
                    type="number"
                    placeholder="Optional (e.g. 10)"
                    value={newTargetTasks}
                    onChange={e => setNewTargetTasks(e.target.value)}
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
              )}

              {newGoalType === 'manual' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
                      Initial Manual Progress
                    </label>
                    <span className="text-xs font-bold text-ink">{newManualProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={newManualProgress}
                    onChange={e => setNewManualProgress(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--accent-deep)',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}

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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
    </motion.div>
  );
}
