import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { db } from '../../db/db';
import type { CalendarEvent } from '../../db/db';
import { getDateString } from '../../utils/date';
import CalendarGrid from './CalendarGrid';
import EventPanel from './EventPanel';

export default function CalendarView() {
  // --- Date States ---
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- Database Query ---
  const events = useLiveQuery(async () => {
    const all = await db.calendarEvents.toArray();
    return all.filter(e => !e.deletedAt);
  }) || [];

  // Selected Date string (YYYY-MM-DD)
  const selectedDateStr = useMemo(() => getDateString(selectedDate), [selectedDate]);

  // Check if an event is active on a specific day string (YYYY-MM-DD)
  const isEventActiveOnDay = (event: CalendarEvent, dayStr: string) => {
    if (event.isLimited && event.limitedEndsAt) {
      return dayStr >= event.date && dayStr <= event.limitedEndsAt;
    }
    return event.date === dayStr;
  };

  // Filter events active on the selected day
  const selectedDayEvents = useMemo(() => {
    return events
      .filter(e => isEventActiveOnDay(e, selectedDateStr))
      .sort((a, b) => {
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [events, selectedDateStr]);

  // --- Handlers ---
  const handlePrevMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleDayClick = (dayDate: Date) => {
    setSelectedDate(dayDate);
  };

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="vtitle">Calendar</div>
      <div className="vsub">Schedule events, track deadlines, and log your hours.</div>

      <div className="bento">
        {/* MONTH GRID */}
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          events={events}
          handleDayClick={handleDayClick}
          handleToday={handleToday}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
        />

        {/* SIDE DETAIL PANEL */}
        <EventPanel
          selectedDate={selectedDate}
          selectedDayEvents={selectedDayEvents}
        />
      </div>
    </motion.div>
  );
}
