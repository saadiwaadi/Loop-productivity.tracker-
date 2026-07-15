import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import LiveClock from '../../components/LiveClock';
import ActiveSession from '../../components/ActiveSession';
import TodayTasks from '../../components/TodayTasks';
import WeekChart from '../../components/WeekChart';
import HabitsToday from '../../components/HabitsToday';
import SparksToday from '../../components/SparksToday';
import ThemeToggle from '../../components/ThemeToggle';
import { calculateMergedDuration } from '../../hooks/useDb';

const DEFAULT_ORDER = ['clock', 'session', 'tasks', 'chart', 'habits', 'ideas'];

export default function HomeView() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutOrder, setLayoutOrder] = useState<string[]>(DEFAULT_ORDER);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Fetch settings reactively
  const settings = useLiveQuery(() => db.settings.get(1));
  const timeEntries = useLiveQuery(() => db.timeEntries.toArray()) || [];

  useEffect(() => {
    if (settings && settings.homeLayout) {
      const hasAll = DEFAULT_ORDER.every(item => settings.homeLayout?.includes(item));
      if (hasAll && settings.homeLayout.length === DEFAULT_ORDER.length) {
        setLayoutOrder(settings.homeLayout);
      }
    }
  }, [settings]);

  // Calculate hours tracked since Monday of this week (non-overlapping)
  const getWeeklyFocusedHours = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekEntries = timeEntries.filter(e => {
      const end = e.endedAt ?? Date.now();
      return end >= startOfWeek.getTime();
    });

    const trimmedEntries = weekEntries.map(e => ({
      startedAt: Math.max(e.startedAt, startOfWeek.getTime()),
      endedAt: e.endedAt,
    }));

    const totalMs = calculateMergedDuration(trimmedEntries);

    return (totalMs / (1000 * 60 * 60)).toFixed(1);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (targetId: string) => {
    if (!isEditMode || !draggedId || draggedId === targetId) return;

    const draggedIdx = layoutOrder.indexOf(draggedId);
    const targetIdx = layoutOrder.indexOf(targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...layoutOrder];
      newOrder[draggedIdx] = targetId;
      newOrder[targetIdx] = draggedId;
      setLayoutOrder(newOrder);
      db.settings.update(1, { homeLayout: newOrder });
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'clock':
        return <LiveClock />;
      case 'session':
        return <ActiveSession />;
      case 'tasks':
        return <TodayTasks />;
      case 'chart':
        return <WeekChart />;
      case 'habits':
        return <HabitsToday />;
      case 'ideas':
        return <SparksToday />;
      default:
        return null;
    }
  };

  const getSpanClass = (id: string) => {
    if (id === 'chart') return 'span-8';
    return 'span-4';
  };

  const hoursThisWeek = getWeeklyFocusedHours();

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
          <h1>
            {new Date().getHours() >= 12 && new Date().getHours() < 18
              ? 'Good afternoon'
              : new Date().getHours() >= 18 || new Date().getHours() < 6
              ? 'Good evening'
              : 'Good morning'}
            , {settings?.name || 'Saad'}
          </h1>
          <p id="subline">A quiet page for a loud day. Focus on what matters.</p>
        </div>
        <div className="top-right">
          <div className="stat">
            <div className="k">Focused this week</div>
            <div className="v" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hoursThisWeek}h
              <Icons.ArrowUpRight size={22} style={{ color: 'var(--accent-deep)', strokeWidth: 2.6 }} />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Edit Layout toggle strip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 8px 14px' }}>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className="ghost-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '38px', width: 'auto', padding: '0 15px', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13.5px' }}
        >
          <Icons.Sliders size={15} style={{ strokeWidth: 1.9 }} />
          <span>{isEditMode ? 'Done' : 'Edit layout'}</span>
        </button>
      </div>

      {/* Bento Grid */}
      <div className={`bento ${isEditMode ? 'editing' : ''}`}>
        {layoutOrder.map(id => (
          <div
            key={id}
            className={`card w ${getSpanClass(id)} drag ${draggedId === id ? 'dragging' : ''}`}
            draggable={isEditMode}
            onDragStart={e => handleDragStart(e, id)}
            onDragOver={handleDragOver}
            onDragEnter={() => handleDragEnter(id)}
            onDragEnd={handleDragEnd}
            style={{ position: 'relative' }}
          >
            <motion.div layout style={{ width: '100%', height: '100%' }}>
              {isEditMode && (
                <div className="handle">
                  <Icons.GripVertical size={14} />
                </div>
              )}
              {renderWidget(id)}
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
