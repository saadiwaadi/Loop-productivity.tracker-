import { useMemo } from 'react';
import * as Icons from 'lucide-react';
import type { CalendarEvent } from '../../db/db';
import { getDateString } from '../../utils/date';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  handleDayClick: (dayDate: Date) => void;
  handleToday: () => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
}

export default function CalendarGrid({
  currentDate,
  selectedDate,
  events,
  handleDayClick,
  handleToday,
  handlePrevMonth,
  handleNextMonth,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const isEventActiveOnDay = (event: CalendarEvent, dayStr: string) => {
    if (event.isLimited && event.limitedEndsAt) {
      return dayStr >= event.date && dayStr <= event.limitedEndsAt;
    }
    return event.date === dayStr;
  };

  const daysInGrid = useMemo(() => {
    const grid: { date: Date; isCurrentMonth: boolean }[] = [];

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Weekday index (0=Sun, 1=Mon... 6=Sat)
    const firstDayIndex = firstDay.getDay();
    // Monday start adjust (if Sun => index 6, else index - 1)
    const startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Number of days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Number of days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Pad previous month days
    for (let i = startPadding - 1; i >= 0; i--) {
      grid.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Pad next month days to fit exactly 6 weeks (42 cells)
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return grid;
  }, [year, month]);

  return (
    <div className="card w span-8 calendar-card">
      <div className="calendar-header">
        <div className="calendar-header-title">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div className="calendar-nav-buttons">
          <button onClick={handleToday} className="ghost-btn" style={{ padding: '8px 12px', fontSize: '13px' }}>
            Today
          </button>
          <button onClick={handlePrevMonth} className="ghost-btn" style={{ padding: '8px', borderRadius: '50%' }}>
            <Icons.ChevronLeft size={16} />
          </button>
          <button onClick={handleNextMonth} className="ghost-btn" style={{ padding: '8px', borderRadius: '50%' }}>
            <Icons.ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays-grid">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-weekday-label">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-days-grid">
        {daysInGrid.map(({ date: dayDate, isCurrentMonth }, idx) => {
          const dayStr = getDateString(dayDate);
          const dayEvents = events.filter(e => isEventActiveOnDay(e, dayStr));
          const isSelected = getDateString(selectedDate) === dayStr;
          const isToday = getDateString(new Date()) === dayStr;

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(dayDate)}
              className={`calendar-day-cell ${!isCurrentMonth ? 'out-of-month' : ''} ${
                isToday ? 'today' : ''
              } ${isSelected ? 'selected' : ''}`}
            >
              <span className="calendar-day-number">{dayDate.getDate()}</span>
              <div className="calendar-day-events-container">
                {dayEvents.slice(0, 3).map((event, eventIdx) => (
                  <div
                    key={eventIdx}
                    className="calendar-micro-badge"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(${event.colorToken}) 18%, transparent)`,
                      color: `var(${event.colorToken})`,
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="calendar-micro-badge" style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
