import { useState, useMemo, useEffect, useRef } from 'react';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { SimpleDateInput } from '../components/ui/SimpleDateInput';
import { useAgenda, useCreateAgenda, useUpdateAgenda } from '../hooks/useAgenda';
import { usePatients } from '../hooks/usePatients';
import { IconCalendarEvent, IconCalendarTime, IconCheck, IconUserX, IconRefresh, IconClock, IconX, IconDots } from '@tabler/icons-react';

const eventStatusOptions = ['programada','confirmada','en_cita','realizada','cancelada','ausente','espera','en_curso'];

function buildMonthMatrix(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDay = start.getDay();
  const days = [];
  let current = new Date(start);
  current.setDate(current.getDate() - startDay);
  while (current <= end || current.getDay() !== 0) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const CustomComboBox = ({ value, onChange, onBlur, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-stretch" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setIsOpen(true)}
        onBlur={onBlur}
        className="w-16 rounded-l-md border border-r-0 border-(--color-border) bg-(--color-card-alt) px-2 py-2 text-(--color-text) text-center focus:outline-none focus:border-(--color-primary)"
        placeholder={placeholder}
      />
      <button
        type="button"
        tabIndex="-1"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-r-md border border-(--color-border) bg-(--color-card-alt) px-1 text-(--color-text-muted) hover:text-(--color-text) focus:outline-none"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {isOpen && (
        <ul className="absolute top-full left-0 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-(--color-border) bg-(--color-card-alt) shadow-lg z-[60] py-1 scrollbar-thin">
          {options.map((opt) => (
            <li
              key={opt}
              className="cursor-pointer px-3 py-1.5 text-center text-sm hover:bg-[rgba(255,255,255,0.05)]"
              onMouseDown={(e) => {
                e.preventDefault(); // Evita que el input pierda el foco y se dispare onBlur antes de tiempo
                onChange({ target: { value: opt } });
                setIsOpen(false);
                if (onBlur) setTimeout(onBlur, 0);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TimePicker = ({ dateStr, onChange }) => {
  const [datePart, timePart] = dateStr ? dateStr.split('T') : ['', '00:00:00'];
  const [h, m] = timePart.split(':');
  
  let initialH24 = parseInt(h || '0', 10);
  let isPM = initialH24 >= 12;
  let initialH12 = initialH24 % 12 || 12;
  
  const [hour, setHour] = useState(String(initialH12));
  const [minute, setMinute] = useState(m || '00');
  const [ampm, setAmpm] = useState(isPM ? 'PM' : 'AM');
  
  useEffect(() => {
    if (dateStr) {
      const parts = dateStr.split('T');
      if (parts.length > 1) {
        const t = parts[1];
        const [hh, mm] = t.split(':');
        const h24 = parseInt(hh, 10);
        const parsedH12 = h24 % 12 || 12;
        const parsedAmPm = h24 >= 12 ? 'PM' : 'AM';
        
        if (parseInt(hour, 10) !== parsedH12 || isNaN(parseInt(hour, 10))) {
          setHour(String(parsedH12));
        }
        if (parseInt(minute, 10) !== parseInt(mm, 10) || isNaN(parseInt(minute, 10))) {
          setMinute(mm);
        }
        if (ampm !== parsedAmPm) {
          setAmpm(parsedAmPm);
        }
      }
    }
  }, [dateStr]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleUpdate = (newHour, newMinute, newAmpm) => {
    let h12 = parseInt(newHour, 10);
    if (isNaN(h12)) h12 = 12; 
    let h24 = h12;
    if (newAmpm === 'PM' && h24 !== 12) h24 += 12;
    if (newAmpm === 'AM' && h24 === 12) h24 = 0;
    
    let mInt = parseInt(newMinute, 10);
    if (isNaN(mInt)) mInt = 0;
    
    const hh = String(h24).padStart(2, '0');
    const mmStr = String(mInt).padStart(2, '0');
    onChange(`${datePart}T${hh}:${mmStr}:00`);
  };

  const handleHourChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setHour(val);
    if (val !== '') handleUpdate(val, minute, ampm);
  };
  
  const handleMinChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setMinute(val);
    if (val !== '') handleUpdate(hour, val, ampm);
  };

  const handleMinBlur = () => {
    if (minute !== '') {
      setMinute(String(parseInt(minute, 10)).padStart(2, '0'));
    }
  };

  const handleAmpmChange = (e) => {
    const val = e.target.value;
    setAmpm(val);
    handleUpdate(hour, minute, val);
  };

  return (
    <div className="flex items-center gap-1.5">
      <CustomComboBox
        value={hour}
        onChange={handleHourChange}
        options={Array.from({ length: 12 }, (_, i) => String(i + 1))}
        placeholder="HH"
      />
      <span className="text-lg font-bold self-center text-[var(--color-text-muted)]">:</span>
      <CustomComboBox
        value={minute}
        onChange={handleMinChange}
        onBlur={handleMinBlur}
        options={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
        placeholder="MM"
      />
      <select
        value={ampm}
        onChange={handleAmpmChange}
        className="w-20 rounded-md border border-(--color-border) bg-(--color-card-alt) px-2 py-2 text-sm text-(--color-text) focus:outline-none focus:border-(--color-primary)"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default function Agenda() {
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [viewDate, setViewDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    event_type: 'cita',
    title: '',
    description: '',
    patient_id: null,
    phone: '',
    status: 'programada',
    start_at: '',
    end_at: '',
    metadata: {
      reason: '',
      medium: '',
      with_whom: '',
      location: '',
      reminder_at: '',
    },
  });

  const { data } = useAgenda();
  const events = useMemo(() => data?.data || [], [data]);
  const { data: patientsResp } = usePatients();
  const patients = useMemo(() => patientsResp?.data || [], [patientsResp]);
  const createMutation = useCreateAgenda();
  const updateMutation = useUpdateAgenda();

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef();

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

  const openNew = (day) => {
    // Para que al hacer click se cree a las 9am o a la hora actual
    const d = new Date(day);
    if (viewMode === 'day') {
       // Si estamos en vista día y el click fue general, podríamos usar la hora actual, pero por ahora 9am
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    setForm((prev) => ({
      ...prev,
      start_at: `${yyyy}-${mm}-${dd}T09:00:00`,
      end_at: '',
    }));
    setModalOpen(true);
  };

  const handlePatientSelection = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    setForm((prev) => ({
      ...prev,
      patient_id: patientId || null,
      title: patient ? `Cita — ${patient.first_name} ${patient.last_name}` : prev.title,
      phone: patient?.phone || prev.phone,
    }));
  };

  const submit = async () => {
    if (!form.title || form.title.trim() === '') {
      alert('Por favor, ingresa un título para el evento.');
      return;
    }
    
    try {
      // Necesitamos enviar las fechas en formato ISO
      const payload = {
        ...form,
        patient_id: form.patient_id || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        reminder_at: form.metadata.reminder_at ? new Date(form.metadata.reminder_at).toISOString() : null,
      };
      
      await createMutation.mutateAsync(payload);
      setModalOpen(false);
      setForm({
        event_type: 'cita',
        title: '',
        description: '',
        patient_id: null,
        phone: '',
        status: 'programada',
        start_at: '',
        end_at: '',
        metadata: {
          reason: '',
          medium: '',
          with_whom: '',
          location: '',
          reminder_at: '', // Asegurarse de que esta propiedad siempre exista
        },
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar evento');
    }
  };

  // Helper para combinar fecha (YYYY-MM-DD) y hora (HH:mm:ss) en un string ISO local
  const combineDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const timePart = timeStr ? timeStr.split('T')[1] || '00:00:00' : '00:00:00';
    return `${dateStr}T${timePart}`;
  };

  // Helper para separar un string ISO local en [fecha, hora]
  const splitDateTime = (dateTimeStr) => {
    if (!dateTimeStr || !dateTimeStr.includes('T')) return [dateTimeStr, ''];
    const [datePart, timePart] = dateTimeStr.split('T');
    return [datePart, timePart ? `${datePart}T${timePart}` : ''];
  };

  // Basic browser notification scheduling for events that include metadata.reminder_at
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();

    const timers = [];
    events.forEach(ev => {
      const reminder = ev.metadata?.reminder_at;
      if (!reminder) return;
      const when = new Date(reminder).getTime();
      const now = Date.now();
      const delay = when - now;
      if (delay > 0 && delay < 1000 * 60 * 60 * 24 * 7) { // schedule up to a week ahead in-page
        const id = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(ev.title || 'Recordatorio', { body: ev.description || 'Tienes un evento programado', tag: ev.id });
          }
        }, delay);
        timers.push(id);
      }
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [events]);

  const openDetails = (ev) => {
    setSelectedEvent(ev);
    setDetailModalOpen(true);
    setIsEditingEvent(false);
  };

  const selectedPatient = selectedEvent ? patients.find((p) => p.id === selectedEvent.patient_id) : null;

  const applyStatusChange = async (ev, newStatus) => {
    try {
      await updateMutation.mutateAsync({ id: ev.id, payload: { status: newStatus } });
      // refresh happens via react-query invalidation
      setSelectedEvent((s) => s ? { ...s, status: newStatus } : s);
      setOptionsOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al actualizar estado');
    }
  };

  const saveEventEdits = async () => {
    if (!selectedEvent) return;
    try {
      const payload = {
        title: selectedEvent.title,
        description: selectedEvent.description,
        start_at: new Date(selectedEvent.start_at).toISOString(),
        end_at: selectedEvent.end_at ? new Date(selectedEvent.end_at).toISOString() : null,
        reminder_at: selectedEvent.metadata?.reminder_at ? new Date(selectedEvent.metadata.reminder_at).toISOString() : null,
        metadata: selectedEvent.metadata || null,
      };
      await updateMutation.mutateAsync({ id: selectedEvent.id, payload });
      setIsEditingEvent(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar cambios');
    }
  };

  const navigatePrev = () => {
    const d = new Date(viewDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    setViewDate(d);
  };

  const navigateNext = () => {
    const d = new Date(viewDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    setViewDate(d);
  };

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `Vista mes — ${viewDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}`;
    }
    if (viewMode === 'week') {
      const start = new Date(viewDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `Vista semana — ${start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (viewMode === 'day') {
      return `Vista día — ${viewDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
  };

  const renderEventCard = (ev, showDetails = false) => {
    const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-(--color-success)' : ev.event_type === 'reunion' ? 'border-l-4 border-(--color-teal)' : ev.event_type === 'videollamada' ? 'border-l-4 border-(--color-gold)' : 'border-l-4 border-(--color-amber)';
    const statusBg = ev.status === 'confirmada' ? 'bg-(--color-success) text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-(--color-danger) text-white' : ev.status === 'realizada' ? 'bg-teal-600 text-white' : ev.status === 'en_curso' ? 'bg-amber-600 text-white' : ev.status === 'espera' ? 'bg-orange-500 text-white' : 'bg-(--color-card-alt) text-(--color-text)';
    
    return (
      <button key={ev.id} onClick={(e) => { e.stopPropagation(); openDetails(ev); }} className={`w-full text-left rounded px-2 py-1.5 border ${typeColor} border-(--color-border) ${statusBg} text-xs mb-1 hover:brightness-110 flex flex-col gap-1`}> 
        <div className="flex justify-between items-center w-full">
          <div className="font-semibold truncate" title={ev.title}>{ev.title}</div>
          <div className="ml-1 opacity-80 shrink-0">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        {showDetails && ev.patient_id && (
          <div className="text-[10px] opacity-80 truncate">Con paciente</div>
        )}
      </button>
    );
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-2">
      {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
        <div key={d} className="text-sm text-(--color-text-muted) font-semibold p-2 text-center">{d}</div>
      ))}
      {monthDays.map((d) => {
        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
        const dayKey = d.toDateString();
        const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a,b) => new Date(a.start_at) - new Date(b.start_at));
        const isToday = d.toDateString() === new Date().toDateString();

        return (
          <div key={dayKey} onClick={() => openNew(d)} className={`min-h-28 rounded-md p-2 border ${isCurrentMonth ? 'bg-(--color-card-alt)' : 'bg-(--color-card)'} border-(--color-border) cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors flex flex-col`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`text-sm font-semibold flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-(--color-primary) text-white' : ''}`}>{d.getDate()}</div>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 max-h-36">
              {dayEvents.map(ev => renderEventCard(ev))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay());
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((d) => {
          const dayKey = d.toDateString();
          const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a,b) => new Date(a.start_at) - new Date(b.start_at));
          const isToday = d.toDateString() === new Date().toDateString();

          return (
            <div key={dayKey} className="flex flex-col">
              <div className={`text-center p-2 mb-2 rounded ${isToday ? 'bg-(--color-primary) text-white' : 'text-(--color-text-muted)'}`}>
                <div className="text-xs uppercase font-semibold">{d.toLocaleDateString('es-MX', { weekday: 'short' })}</div>
                <div className="text-xl font-bold">{d.getDate()}</div>
              </div>
              <div onClick={() => openNew(d)} className="flex-1 min-h-[400px] border border-(--color-border) rounded bg-(--color-card-alt) p-2 space-y-1 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                {dayEvents.map(ev => renderEventCard(ev, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayKey = viewDate.toDateString();
    const dayEvents = [...(eventsByDay[dayKey] || [])].sort((a,b) => new Date(a.start_at) - new Date(b.start_at));

    return (
      <div onClick={() => openNew(viewDate)} className="min-h-[400px] bg-(--color-card-alt) border border-(--color-border) rounded p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
        {dayEvents.length === 0 ? (
          <div className="text-center text-(--color-text-muted) py-10">No hay eventos programados para este día.</div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(ev => {
              const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-(--color-success)' : ev.event_type === 'reunion' ? 'border-l-4 border-(--color-teal)' : ev.event_type === 'videollamada' ? 'border-l-4 border-(--color-gold)' : 'border-l-4 border-(--color-amber)';
              const statusBg = ev.status === 'confirmada' ? 'bg-(--color-success) text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-(--color-danger) text-white' : ev.status === 'realizada' ? 'bg-teal-600 text-white' : ev.status === 'en_curso' ? 'bg-amber-600 text-white' : ev.status === 'espera' ? 'bg-orange-500 text-white' : 'bg-(--color-card) text-(--color-text)';
              
              return (
                <div key={ev.id} onClick={(e) => { e.stopPropagation(); openDetails(ev); }} className={`flex flex-col sm:flex-row p-4 rounded border ${typeColor} border-(--color-border) ${statusBg} items-start sm:items-center justify-between gap-4 hover:brightness-110 transition-all`}>
                  <div>
                    <h3 className="font-bold text-lg">{ev.title}</h3>
                    <p className="opacity-90 text-sm flex items-center gap-2 mt-1">
                      <IconClock size={16} />
                      {new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                      {ev.end_at ? ` - ${new Date(ev.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                    {ev.description && <p className="mt-2 text-sm opacity-80">{ev.description}</p>}
                  </div>
                  <div className="text-sm font-bold uppercase opacity-90 px-3 py-1 rounded bg-black/20 self-start sm:self-auto">
                    {ev.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Pre-fill dates for editing properly
  const getLocalDateTimeString = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  return (
    <div className="min-h-screen p-6 bg-(--color-surface)">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-(--color-text)">Agenda</h1>
          <p className="text-(--color-text-muted)">Calendario de actividades y citas</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {/*<div className="flex p-1 bg-(--color-card) rounded-md border border-(--color-border)">
            <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${viewMode === 'month' ? 'bg-(--color-secondary) text-white shadow' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}>Mes</button>
            <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${viewMode === 'week' ? 'bg-(--color-secondary) text-white shadow' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}>Semana</button>
            <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-sm rounded font-medium transition-colors ${viewMode === 'day' ? 'bg-(--color-secondary) text-white shadow' : 'text-(--color-text-muted) hover:text-(--color-text)'}`}>Día</button> 
          </div> */}
          <div className="flex gap-2">
            <GymButton onClick={navigatePrev} variant="secondary">Anterior</GymButton>
            <GymButton onClick={() => setViewDate(new Date())} variant="ghost">Hoy</GymButton>
            <GymButton onClick={navigateNext} variant="primary">Siguiente</GymButton>
          </div>
        </div>
      </header>

      <GymCard title={getViewTitle()} variant="default">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </GymCard>
      
      <GymModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedEvent?.title || 'Detalle de Agenda'} width="lg">
        {selectedEvent && (
          <div className="space-y-4 text-(--color-text)">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-(--color-text-muted)">Tipo</p>
                <p className="font-semibold">{selectedEvent.event_type}</p>
              </div>
              <div className="relative" ref={optionsRef}>
                <GymButton size="sm" variant="ghost" onClick={() => setOptionsOpen(!optionsOpen)}>Opciones <IconDots className="inline ml-2" /></GymButton>
                {optionsOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded border border-(--color-border) bg-(--color-card-alt) p-2 z-50">
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingEvent(true); setOptionsOpen(false); }}><IconCalendarTime size={18} />Editar / Reagendar</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'confirmada'); }}><IconCheck size={18} />Confirmar</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'ausente'); }}><IconUserX size={18} />Ausente</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'realizada'); }}><IconRefresh size={18} />Concretar</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'espera'); }}><IconClock size={18} />Espera</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 text-red-500 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'en_curso'); }}><IconCalendarEvent size={18} />En Curso</button>
                    <button type="button" className="w-full flex items-center gap-2 px-2 py-1 text-red-500 hover:bg-[rgba(255,255,255,0.02)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'cancelada'); }}><IconX size={18} />Cancelar</button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingEvent ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Paciente</p>
                    <p>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Teléfono</p>
                    <p>{selectedEvent.phone || selectedPatient?.phone || '—'}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Fecha y Hora</p>
                    <p>{new Date(selectedEvent.start_at).toLocaleString('es-MX')} — {selectedEvent.end_at ? new Date(selectedEvent.end_at).toLocaleString('es-MX') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Estado</p>
                    <p className="font-semibold">{selectedEvent.status}</p>
                  </div>
                </div>

                {selectedEvent.metadata?.reason && (
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Razón</p>
                    <p>{selectedEvent.metadata.reason}</p>
                  </div>
                )}
                {(selectedEvent.metadata?.medium || selectedEvent.metadata?.location) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-(--color-text-muted)">Medio</p>
                      <p>{selectedEvent.metadata?.medium || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-(--color-text-muted)">Lugar / Plataforma</p>
                      <p>{selectedEvent.metadata?.location || '-'}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.metadata?.with_whom && (
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Con quién</p>
                    <p>{selectedEvent.metadata.with_whom}</p>
                  </div>
                )}
                {selectedEvent.metadata?.reminder_at && (
                  <div>
                    <p className="text-sm text-(--color-text-muted)">Recordatorio</p>
                    <p>{new Date(selectedEvent.metadata.reminder_at).toLocaleString('es-MX')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-(--color-text-muted)">Notas</p>
                  <p className="whitespace-pre-wrap">{selectedEvent.description || '—'}</p>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <GymButton variant="secondary" onClick={() => setDetailModalOpen(false)}>Cerrar</GymButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-(--color-text-muted)">Título</label>
                  <input type="text" value={selectedEvent.title} onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })} className="w-full rounded border border-(--color-border) px-3 py-2 bg-(--color-card-alt) text-(--color-text)" />
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                    <div>
                      <label className="block text-sm text-(--color-text-muted) mb-1">Fecha Inicio</label>
                      <SimpleDateInput 
                        value={splitDateTime(getLocalDateTimeString(selectedEvent.start_at))[0]}
                        onChange={(date) => setSelectedEvent(prev => ({ ...prev, start_at: combineDateTime(date, prev.start_at) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-(--color-text-muted) mb-1">Hora Inicio</label>
                      <TimePicker
                        dateStr={getLocalDateTimeString(selectedEvent.start_at)}
                        onChange={(newVal) => setSelectedEvent(prev => ({ ...prev, start_at: newVal }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                    <div>
                      <label className="block text-sm text-(--color-text-muted) mb-1">Fecha Fin</label>
                      <SimpleDateInput 
                        value={splitDateTime(getLocalDateTimeString(selectedEvent.end_at))[0]}
                        onChange={(date) => setSelectedEvent(prev => ({ ...prev, end_at: combineDateTime(date, prev.end_at) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-(--color-text-muted) mb-1">Hora Fin</label>
                      <TimePicker
                        dateStr={getLocalDateTimeString(selectedEvent.end_at)}
                        onChange={(newVal) => setSelectedEvent(prev => ({ ...prev, end_at: newVal }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-(--color-text-muted)">Notas adicionales</label>
                  <textarea value={selectedEvent.description || ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })} rows={3} className="w-full rounded border border-(--color-border) px-3 py-2 bg-(--color-card-alt) text-(--color-text)" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <GymButton variant="secondary" onClick={() => setIsEditingEvent(false)}>Cancelar</GymButton>
                  <GymButton variant="primary" onClick={saveEventEdits}>Guardar</GymButton>
                </div>
              </div>
            )}
          </div>
        )}
      </GymModal>

      <GymModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={form.event_type === 'cita' ? 'Agendar Cita' : `Nueva ${form.event_type}`} width="lg">
        <div className="space-y-6 text-(--color-text)">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-(--color-text-muted)">Tipo de agenda</label>
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)">
                <option value="cita">Cita</option>
                <option value="reunion">Reunión</option>
                <option value="videollamada">Videollamada</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-(--color-text-muted)">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)">
                {eventStatusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-(--color-text-muted)">Título</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
          </div>

          {form.event_type === 'cita' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-(--color-text-muted)">Paciente</label>
                <select value={form.patient_id || ''} onChange={(e) => handlePatientSelection(e.target.value)} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)">
                  <option value="">Seleccionar paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.phone || 'Sin teléfono'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-(--color-text-muted)">Teléfono</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
              </div>
            </div>
          )}

          {(form.event_type === 'videollamada' || form.event_type === 'reunion' || form.event_type === 'otro') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-(--color-text-muted)">Razón</label>
                <input value={form.metadata.reason} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, reason: e.target.value } })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
              </div>
              <div>
                <label className="block text-sm text-(--color-text-muted)">Con quién</label>
                <input value={form.metadata.with_whom} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, with_whom: e.target.value } })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
              </div>
            </div>
          )}

          {(form.event_type === 'videollamada' || form.event_type === 'reunion') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-(--color-text-muted)">Medio</label>
                <input value={form.metadata.medium} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, medium: e.target.value } })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
              </div>
              <div>
                <label className="block text-sm text-(--color-text-muted)">Lugar / Plataforma</label>
                <input value={form.metadata.location} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, location: e.target.value } })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
              </div>
            </div>
          )}

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
              <div>
                <label className="block text-sm text-(--color-text-muted) mb-1">Fecha de inicio</label>
                <SimpleDateInput 
                  value={splitDateTime(form.start_at)[0]}
                  onChange={(date) => setForm(prev => ({ ...prev, start_at: combineDateTime(date, prev.start_at) }))}
                />
              </div>
              <div>
                <label className="block text-sm text-(--color-text-muted) mb-1">Hora de inicio</label>
                <TimePicker
                  dateStr={form.start_at}
                  onChange={(newVal) => setForm({ ...form, start_at: newVal })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-(--color-text-muted)">Notas adicionales</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
          </div>
          
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
              <div>
                <label className="block text-sm text-(--color-text-muted) mb-1">Fecha Recordatorio</label>
                <SimpleDateInput 
                  value={splitDateTime(form.metadata.reminder_at)[0]}
                  onChange={(date) => setForm(prev => ({ ...prev, metadata: { ...prev.metadata, reminder_at: combineDateTime(date, prev.metadata.reminder_at) } }))}
                />
              </div>
              <div>
                <label className="block text-sm text-(--color-text-muted) mb-1">Hora Recordatorio</label>
                <TimePicker
                  dateStr={form.metadata.reminder_at}
                  onChange={(newVal) => setForm(prev => ({ ...prev, metadata: { ...prev.metadata, reminder_at: newVal } }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <GymButton variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</GymButton>
            <GymButton variant="primary" onClick={submit}>Guardar</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}
