import React, { useMemo } from 'react';
import { IconPlus } from '@tabler/icons-react';

function buildMonthMatrix(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDay = (start.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const days = [];
  let current = new Date(start);
  current.setDate(current.getDate() - startDay);

  // Ensure we have a full 6-week grid for consistent height
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const renderEventCard = (ev, onEventClick) => {
  const timeStr = new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusDotColor =
    ev.status === 'confirmada' ? 'bg-[var(--color-success)]' :
      ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-[var(--color-danger)]' :
        ev.status === 'realizada' ? 'bg-teal-500' :
          ev.status === 'en_curso' ? 'bg-amber-500' :
            'bg-[var(--color-gold)]';

  return (
    <button
      key={ev.id}
      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
      className="w-full text-left text-xs py-0.5 px-0.5 rounded hover:bg-white/5 flex items-center gap-1 transition-colors group cursor-pointer leading-none"
      title={`${timeStr} - ${ev.title}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`} />
      <span className="font-bold text-[11px] shrink-0 text-black leading-none">{timeStr}</span>
      <span className="text-[var(--color-text)] text-xs font-normal truncate group-hover:text-[var(--color-gold)] transition-colors leading-none">
        {ev.title}
      </span>
    </button>
  );
};

export const AgendaCalendar = ({
  viewDate,
  events = [],
  selectedDate,
  onSelectDate,
  onDayClick,
  onEventClick
}) => {
  const monthDays = useMemo(() => buildMonthMatrix(viewDate), [viewDate]);

  // Robust date key generation (Year-Month-Day)
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      if (!ev.start_at) return;
      const d = new Date(ev.start_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map[key] = map[key] || [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_minmax(0,0.75fr)] gap-0.5 sm:gap-1">
      {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
        <div key={d} className="text-xs text-[var(--color-text-muted)] font-semibold p-0.5 text-center uppercase tracking-wider">{d}</div>
      ))}
      {monthDays.map((d) => {
        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        const isToday = d.toDateString() === new Date().toDateString();
        const isSunday = d.getDay() === 0;
        const isSelected = selectedDate && (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );

        return (
          <div
            key={dayKey}
            onClick={() => onSelectDate && onSelectDate(d)}
            className={`rounded-sm p-1 border transition-all flex flex-col min-h-[210px] sm:min-h-[230px] h-56 sm:h-64 cursor-pointer ${isSelected
                ? 'ring-2 ring-[var(--color-gold)] border-[var(--color-gold)] bg-[var(--color-card-alt)] shadow-md z-10'
                : isCurrentMonth
                  ? 'bg-[var(--color-card-alt)] hover:border-[var(--color-gold)]/50 border-[var(--color-border)]'
                  : 'bg-[var(--color-card)] opacity-40 border-[var(--color-border)]'
              }`}
          >
            <div className="flex justify-between items-center mb-1">
              <div className={`text-xs font-bold flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${isToday ? 'bg-[var(--color-gold)] text-white shadow' : ''} ${!isCurrentMonth ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                {d.getDate()}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick(d);
                }}
                className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-[var(--color-gold)] text-[var(--color-text-muted)] hover:text-white transition-colors"
                title="Agendar cita para este día"
              >
                <IconPlus size={12} />
              </button>
            </div>
            <div className="space-y-0 overflow-y-auto flex-1 scrollbar-thin">
              {dayEvents.map(ev => renderEventCard(ev, onEventClick))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
