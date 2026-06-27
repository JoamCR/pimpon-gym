import React, { useMemo } from 'react';

function buildMonthMatrix(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDay = start.getDay();
  const days = [];
  let current = new Date(start);
  current.setDate(current.getDate() - startDay);
  
  // Ensure we have a full 6-week grid for consistent height
  const endDate = new Date(end);
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const renderEventCard = (ev, onEventClick) => {
    const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-[var(--color-success)]' : ev.event_type === 'reunion' ? 'border-l-4 border-[var(--color-teal)]' : ev.event_type === 'videollamada' ? 'border-l-4 border-[var(--color-gold)]' : 'border-l-4 border-[var(--color-amber)]';
    const statusBg = ev.status === 'confirmada' ? 'bg-[var(--color-success)] text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-[var(--color-danger)] text-white' : ev.status === 'realizada' ? 'bg-teal-600 text-white' : ev.status === 'en_curso' ? 'bg-amber-600 text-white' : ev.status === 'espera' ? 'bg-orange-500 text-white' : 'bg-[var(--color-card)] text-[var(--color-text)]';
    
    return (
      <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className={`w-full text-left rounded border ${typeColor} border-[var(--color-border)] ${statusBg} text-xs mb-0.5 hover:brightness-110 flex flex-col gap-0`}> 
        <div className="flex justify-between items-center w-full">
          <div className="text-[0.4rem]" title={ev.title}>{ev.title}</div>
          <div className="opacity-80 shrink-0 text-[0.4rem]">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </button>
    );
};


export const AgendaCalendar = ({ viewDate, events, onDayClick, onEventClick }) => {
  const monthDays = useMemo(() => buildMonthMatrix(viewDate), [viewDate]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const day = new Date(ev.start_at).toDateString();
      map[day] = map[day] || [];
      map[day].push(ev);
    });
    return map;
  }, [events]);
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
        <div key={d} className="text-sm text-[var(--color-text-muted)] font-semibold p-2 text-center">{d}</div>
      ))}
      {monthDays.map((d) => {
        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
        const dayKey = d.toDateString();
        const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a,b) => new Date(a.start_at) - new Date(b.start_at));
        const isToday = d.toDateString() === new Date().toDateString();

        return (
          <div 
            key={dayKey} 
            onClick={() => onDayClick(d)} 
            className={`rounded-md p-2 border ${isCurrentMonth ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)] opacity-50'} border-[var(--color-border)] cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors flex flex-col`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`text-sm font-semibold flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-[var(--color-primary)] text-white' : ''} ${!isCurrentMonth ? 'text-[var(--color-text-muted)]' : ''}`}>{d.getDate()}</div>
            </div>
            <div className="space-y-1 overflow-y-auto h-[100px] scrollbar-thin">
              {dayEvents.map(ev => renderEventCard(ev, onEventClick))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
