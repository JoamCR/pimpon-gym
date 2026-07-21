import React, { useMemo } from 'react';
import { IconPlus } from '@tabler/icons-react';

function buildMonthMatrix(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDay = start.getDay();
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
    const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-[var(--color-success)]' : ev.event_type === 'reunion' ? 'border-l-4 border-[var(--color-secondary)]' : ev.event_type === 'videollamada' ? 'border-l-4 border-[var(--color-gold)]' : 'border-l-4 border-[var(--color-amber)]';
    const statusBg = ev.status === 'confirmada' ? 'bg-[var(--color-success)] text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-[var(--color-danger)] text-white' : ev.status === 'realizada' ? 'bg-teal-600 text-white' : ev.status === 'en_curso' ? 'bg-amber-600 text-white' : ev.status === 'espera' ? 'bg-orange-500 text-white' : 'bg-[var(--color-card)] text-[var(--color-text)]';
    
    return (
      <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className={`w-full text-left rounded border ${typeColor} border-[var(--color-border)] ${statusBg} text-xs hover:brightness-110 flex flex-col gap-0 p-1`}> 
        <div className="flex justify-between items-center w-full">
          <div className="text-xs whitespace-nowrap overflow-hidden text-ellipsis font-medium" title={ev.title}>{ev.title}</div>
          <div className="opacity-80 shrink-0 text-[10px] ml-1">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
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
    <div className="grid grid-cols-7 gap-1">
      {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
        <div key={d} className="text-xs text-[var(--color-text-muted)] font-semibold p-1 text-center uppercase tracking-wider">{d}</div>
      ))}
      {monthDays.map((d) => {
        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a,b) => new Date(a.start_at) - new Date(b.start_at));
        const isToday = d.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );

        return (
          <div 
            key={dayKey} 
            onClick={() => onSelectDate && onSelectDate(d)}
            className={`rounded-md p-1.5 border transition-all flex flex-col h-36 cursor-pointer ${
              isSelected 
                ? 'ring-2 ring-[var(--color-secondary)] border-[var(--color-secondary)] bg-[var(--color-card-alt)]' 
                : isCurrentMonth 
                  ? 'bg-[var(--color-card-alt)] hover:border-[var(--color-secondary)]/50 border-[var(--color-border)]' 
                  : 'bg-[var(--color-card)] opacity-40 border-[var(--color-border)]'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <div className={`text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full ${isToday ? 'bg-[var(--color-secondary)] text-white' : ''} ${!isCurrentMonth ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                {d.getDate()}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick(d);
                }}
                className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-[var(--color-secondary)] text-[var(--color-text-muted)] hover:text-white transition-colors"
                title="Agendar cita para este día"
              >
                <IconPlus size={12} />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 scrollbar-thin">
              {dayEvents.map(ev => renderEventCard(ev, onEventClick))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
