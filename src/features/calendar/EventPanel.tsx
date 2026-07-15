import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { db } from '../../db/db';
import type { CalendarEvent } from '../../db/db';
import { useConfirm } from '../../components/providers/ConfirmProvider';
import { getDateString } from '../../utils/date';

const CATEGORIES: ('work' | 'personal' | 'education' | 'limited')[] = [
  'work',
  'personal',
  'education',
  'limited',
];

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  work: '--violet',
  personal: '--sky',
  education: '--mint',
  limited: '--coral',
};

const COLOR_SWATCHES = [
  '--violet',
  '--sky',
  '--mint',
  '--coral',
  '--amber',
  '--accent',
];

const START_HOUR = 8;
const END_HOUR = 22;

interface EventPanelProps {
  selectedDate: Date;
  selectedDayEvents: CalendarEvent[];
}

export default function EventPanel({ selectedDate, selectedDayEvents }: EventPanelProps) {
  const confirm = useConfirm();

  // --- Form Open State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form Inputs
  const [formTitle, setFormTitle] = useState('');
  const [category, setCategory] = useState<'work' | 'personal' | 'education' | 'limited'>('work');
  const [colorToken, setColorToken] = useState('--violet');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLimited, setIsLimited] = useState(false);
  const [limitedEndsAt, setLimitedEndsAt] = useState('');
  const [reminder, setReminder] = useState(false);
  const [note, setNote] = useState('');

  // Close form on day change
  useEffect(() => {
    setIsFormOpen(false);
    setEditingEvent(null);
  }, [selectedDate]);

  const handleCategoryChange = (cat: 'work' | 'personal' | 'education' | 'limited') => {
    setCategory(cat);
    setColorToken(DEFAULT_CATEGORY_COLORS[cat]);
    if (cat === 'limited') {
      setIsLimited(true);
    }
  };

  const handleAddClick = () => {
    setEditingEvent(null);
    setFormTitle('');
    setCategory('work');
    setColorToken('--violet');
    setStartTime('');
    setEndTime('');
    setIsLimited(false);
    setLimitedEndsAt('');
    setReminder(false);
    setNote('');
    setIsFormOpen(true);
  };

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setCategory(event.category);
    setColorToken(event.colorToken);
    setStartTime(event.startTime || '');
    setEndTime(event.endTime || '');
    setIsLimited(event.isLimited);
    setLimitedEndsAt(event.limitedEndsAt || '');
    setReminder(event.reminder);
    setNote(event.note || '');
    setIsFormOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const eventData = {
      title: formTitle.trim(),
      date: getDateString(selectedDate),
      category,
      colorToken,
      startTime: startTime || null,
      endTime: endTime || null,
      isLimited,
      limitedEndsAt: isLimited && limitedEndsAt ? limitedEndsAt : null,
      reminder,
      note: note.trim() || null,
      updatedAt: new Date(),
    };

    if (editingEvent?.id) {
      await db.calendarEvents.update(editingEvent.id, eventData);
    } else {
      await db.calendarEvents.add({
        ...eventData,
        createdAt: new Date(),
      });
    }

    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteClick = async (event: CalendarEvent) => {
    if (!event.id) return;
    const ok = await confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.title}"?`,
      type: 'danger',
    });
    if (!ok) return;

    await db.calendarEvents.update(event.id, {
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    if (editingEvent?.id === event.id) {
      setIsFormOpen(false);
      setEditingEvent(null);
    }
  };

  // Timeline Helper Calculations
  const parseTimeToDecimal = (timeStr?: string | null): number | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const timelineEvents = useMemo(() => {
    return selectedDayEvents.filter(e => e.startTime);
  }, [selectedDayEvents]);

  const untimedEvents = useMemo(() => {
    return selectedDayEvents.filter(e => !e.startTime);
  }, [selectedDayEvents]);

  const hourRows = useMemo(() => {
    const rows = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const formatted = h < 12 ? `${h}:00 AM` : h === 12 ? `12:00 PM` : `${h - 12}:00 PM`;
      rows.push({ hour: h, label: formatted });
    }
    return rows;
  }, []);

  return (
    <div className="card w span-4" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {!isFormOpen ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div className="event-detail-header">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <button onClick={handleAddClick} className="ghost-btn" style={{ padding: '6px', borderRadius: '50%' }}>
                <Icons.Plus size={18} />
              </button>
            </div>
            <div className="event-detail-subheader">
              {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} scheduled
            </div>

            {/* Untimed Events Section */}
            {untimedEvents.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  All Day / Untimed
                </div>
                <div className="event-list">
                  {untimedEvents.map(event => (
                    <div key={event.id} className="event-item-card">
                      <div className="event-item-left">
                        <div className="event-item-title">{event.title}</div>
                        <div className="event-item-meta">
                          <span
                            className="event-category-badge"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(${event.colorToken}) 15%, transparent)`,
                              color: `var(${event.colorToken})`,
                            }}
                          >
                            {event.category}
                          </span>
                          {event.reminder && <Icons.Bell size={11} />}
                          {event.isLimited && (
                            <span style={{ fontSize: '11px', color: 'var(--coral)' }}>
                              Until {event.limitedEndsAt}
                            </span>
                          )}
                        </div>
                        {event.note && (
                          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>
                            {event.note}
                          </div>
                        )}
                      </div>
                      <div className="event-item-right">
                        <button
                          onClick={() => handleEditClick(event)}
                          className="ghost-btn"
                          style={{ padding: '6px', borderRadius: '6px' }}
                        >
                          <Icons.Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(event)}
                          className="ghost-btn"
                          style={{ padding: '6px', borderRadius: '6px', color: 'var(--coral)' }}
                        >
                          <Icons.Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time-Bounded Events List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedDayEvents.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-faint)',
                    textAlign: 'center',
                    padding: '40px 0',
                  }}
                >
                  <Icons.Calendar size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 650, fontSize: '14px' }}>No events today</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Tap the plus icon to add one.</div>
                </div>
              ) : (
                <>
                  {timelineEvents.length > 0 && (
                    <div className="event-list" style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Timed Events
                      </div>
                      {timelineEvents.map(event => (
                        <div key={event.id} className="event-item-card">
                          <div className="event-item-left">
                            <div className="event-item-title">{event.title}</div>
                            <div className="event-item-meta">
                              <span
                                className="event-category-badge"
                                style={{
                                  backgroundColor: `color-mix(in srgb, var(${event.colorToken}) 15%, transparent)`,
                                  color: `var(${event.colorToken})`,
                                }}
                              >
                                {event.category}
                              </span>
                              <span>
                                {event.startTime} {event.endTime ? ` - ${event.endTime}` : ''}
                              </span>
                              {event.reminder && <Icons.Bell size={11} />}
                            </div>
                            {event.note && (
                              <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>
                                {event.note}
                              </div>
                            )}
                          </div>
                          <div className="event-item-right">
                            <button
                              onClick={() => handleEditClick(event)}
                              className="ghost-btn"
                              style={{ padding: '6px', borderRadius: '6px' }}
                            >
                              <Icons.Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(event)}
                              className="ghost-btn"
                              style={{ padding: '6px', borderRadius: '6px', color: 'var(--coral)' }}
                            >
                              <Icons.Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HOURLY SCHEDULE TIMELINE */}
                  {timelineEvents.length > 0 && (
                    <div className="timeline-container">
                      <div className="timeline-title">Schedule</div>
                      <div className="timeline-scroll">
                        {hourRows.map(({ hour, label }) => (
                          <div key={hour} className="timeline-hour-row">
                            <span className="timeline-hour-label">{label}</span>
                          </div>
                        ))}
                        <div className="timeline-events-overlay">
                          {timelineEvents.map(event => {
                            const start = parseTimeToDecimal(event.startTime);
                            if (start === null) return null;

                            const duration = parseTimeToDecimal(event.endTime)
                              ? (parseTimeToDecimal(event.endTime) as number) - start
                              : 1.0;

                            const totalHours = END_HOUR - START_HOUR;
                            const topPercent = ((start - START_HOUR) / totalHours) * 100;
                            const heightPercent = (duration / totalHours) * 100;

                            const top = Math.max(0, Math.min(100, topPercent));
                            const height = Math.max(8, Math.min(100 - top, heightPercent));

                            return (
                              <div
                                key={event.id}
                                onClick={() => handleEditClick(event)}
                                className="timeline-event-block"
                                style={{
                                  top: `${top}%`,
                                  height: `${height}%`,
                                  backgroundColor: `color-mix(in srgb, var(${event.colorToken}) 14%, var(--card-solid))`,
                                  borderColor: `var(${event.colorToken})`,
                                  color: `var(${event.colorToken})`,
                                }}
                                title={`${event.title} (${event.startTime} - ${event.endTime || '?'})`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div className="event-detail-header" style={{ marginBottom: '20px' }}>
              {editingEvent ? 'Edit Event' : 'New Event'}
            </div>

            <form onSubmit={handleSaveEvent} className="event-form-grid" style={{ flex: 1 }}>
              {/* Title */}
              <div className="event-form-group">
                <label htmlFor="event-title">Title</label>
                <input
                  type="text"
                  id="event-title"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Meeting, workout, study..."
                  required
                  className="event-form-input"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div className="event-form-group">
                <label>Category</label>
                <div className="category-pill-group">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`category-pill-btn ${category === cat ? 'active' : ''} ${cat}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="event-form-group">
                <label>Color Token</label>
                <div className="color-swatch-group">
                  {COLOR_SWATCHES.map(swatch => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setColorToken(swatch)}
                      className={`color-swatch ${colorToken === swatch ? 'active' : ''}`}
                      style={{ backgroundColor: `var(${swatch})` }}
                    />
                  ))}
                </div>
              </div>

              {/* Start & End Times */}
              <div className="event-form-row">
                <div className="event-form-group">
                  <label htmlFor="event-start">Start Time</label>
                  <input
                    type="time"
                    id="event-start"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="event-form-input"
                  />
                </div>
                <div className="event-form-group">
                  <label htmlFor="event-end">End Time</label>
                  <input
                    type="time"
                    id="event-end"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="event-form-input"
                  />
                </div>
              </div>

              {/* Is Limited & Limited Ends At */}
              <div className="event-form-checkbox-row">
                <label htmlFor="event-is-limited">Limited-Time (Range)</label>
                <input
                  type="checkbox"
                  id="event-is-limited"
                  checked={isLimited}
                  onChange={e => setIsLimited(e.target.checked)}
                />
              </div>

              {isLimited && (
                <div className="event-form-group">
                  <label htmlFor="event-ends-at">Ends At</label>
                  <input
                    type="date"
                    id="event-ends-at"
                    value={limitedEndsAt}
                    onChange={e => setLimitedEndsAt(e.target.value)}
                    className="event-form-input"
                    required={isLimited}
                  />
                </div>
              )}

              {/* Reminder */}
              <div className="event-form-checkbox-row">
                <label htmlFor="event-reminder">Enable Notification Reminder</label>
                <input
                  type="checkbox"
                  id="event-reminder"
                  checked={reminder}
                  onChange={e => setReminder(e.target.checked)}
                />
              </div>

              {/* Note */}
              <div className="event-form-group">
                <label htmlFor="event-note">Notes</label>
                <textarea
                  id="event-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="event-form-textarea"
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn soft"
                  style={{ flex: 1, padding: '10px 0', fontSize: '13.5px', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  style={{ flex: 1, padding: '10px 0', fontSize: '13.5px', borderRadius: '10px' }}
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
