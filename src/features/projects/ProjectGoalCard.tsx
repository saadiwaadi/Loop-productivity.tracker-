import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useTasks } from '../../hooks/useDb';

interface ProjectGoalCardProps {
  projectId: number;
}

export default function ProjectGoalCard({ projectId }: ProjectGoalCardProps) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const allTasks = useTasks();
  const allTimeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  if (!project) return null;

  const projTasks = allTasks.filter(t => t.projectId === projectId);
  const totalTasks = projTasks.length;
  const completedTasks = projTasks.filter(t => t.done).length;

  const projEntries = allTimeEntries.filter(e => e.projectId === projectId);
  const loggedHours = projEntries.reduce((sum, entry) => {
    const end = entry.endedAt ?? (entry.pausedAt ?? Date.now());
    return sum + (end - entry.startedAt) / (1000 * 60 * 60);
  }, 0);

  let calculatedProgress = 0;
  const goalType = project.goalType || 'hours';

  if (goalType === 'hours') {
    const target = project.targetHours || 0;
    calculatedProgress = target > 0 ? Math.round(Math.min(100, (loggedHours / target) * 100)) : 0;
  } else if (goalType === 'tasks') {
    const target = project.targetTasks || 0;
    if (target > 0) {
      calculatedProgress = Math.round(Math.min(100, (completedTasks / target) * 100));
    } else {
      calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }
  } else if (goalType === 'manual') {
    calculatedProgress = project.manualProgress ?? 0;
  }

  return (
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
  );
}
