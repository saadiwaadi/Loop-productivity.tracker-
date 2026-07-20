import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import CustomSelect from '../../components/ui/CustomSelect';
import ProjectDetailTasks from './ProjectDetailTasks';
import ProjectDetailSessions from './ProjectDetailSessions';
import ProjectGoalCard from './ProjectGoalCard';

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
  const [projectNotes, setProjectNotes] = useState('');
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px',
            height: '38px',
            width: 'auto',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ink-soft)',
            background: 'var(--card-2)',
            border: '1px solid var(--stroke-2)',
          }}
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
            <h1 className="pd-title" style={{ lineHeight: 1.1, margin: 0 }}>{project.name}</h1>
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

      {/* Grid Layout: uses the shared .bento grid (same as every other view) so it
          collapses to a single stacked column on mobile instead of leaving the
          right column permanently off-screen. Roughly matches the old 1.25:0.75
          desktop ratio via the existing span-7/span-5 utility classes. */}
      <div className="bento">

        {/* LEFT COLUMN: Sessions and Tasks */}
        <div className="w span-7" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ProjectDetailSessions projectId={projectId} />
          <ProjectDetailTasks projectId={projectId} />
        </div>

        {/* RIGHT COLUMN: Notes and Configuration */}
        <div className="w span-5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
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

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
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

              {/* Conditional Task Goal Input */}
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
                <div className="icon-picker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '4px' }}>
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
              <ProjectGoalCard projectId={projectId} />

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
