import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { useAgenda, useCreateAgenda, useUpdateAgenda } from '../hooks/useAgenda';
import { usePatients } from '../hooks/usePatients';
import { IconPlus, IconCalendarEvent, IconCalendarTime, IconCheck, IconUserX, IconRefresh, IconClock, IconX, IconBell, IconDots } from '@tabler/icons-react';

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

export default function Agenda() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ event_type: 'cita', title: '', description: '', patient_id: null, phone: '', status: 'programada', start_at: '', end_at: '' });

  const { data } = useAgenda();
  const events = data?.data || [];
  const { data: patientsResp } = usePatients();
  const patients = patientsResp?.data || [];
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

  useEffect(() => {
    if (selectedDay) {
      const iso = new Date(selectedDay).toISOString().slice(0,10);
      setForm((f) => ({ ...f, start_at: `${iso}T09:00:00.000Z`, end_at: `${iso}T10:00:00.000Z` }));
    }
  }, [selectedDay]);

  const openNew = (day) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      await createMutation.mutateAsync({
        ...form,
      });
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar evento');
    }
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
        start_at: selectedEvent.start_at,
        end_at: selectedEvent.end_at,
        metadata: selectedEvent.metadata || null,
      };
      await updateMutation.mutateAsync({ id: selectedEvent.id, payload });
      setIsEditingEvent(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar cambios');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)]">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text)]">Agenda</h1>
          <p className="text-[var(--color-text-muted)]">Calendario de actividades y citas</p>
        </div>
        <div className="flex gap-2">
          <GymButton onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() -1, 1))} variant="secondary">Anterior</GymButton>
          <GymButton onClick={() => setViewDate(new Date())} variant="ghost">Hoy</GymButton>
          <GymButton onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() +1, 1))} variant="primary" icon={<IconPlus size={16} />}>Mes Siguiente</GymButton>
        </div>
      </header>

      <GymCard title={`Vista mes — ${viewDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}`} variant="default">
        <div className="grid grid-cols-7 gap-2">
          {['Dom','Lun','Mar','Mie','Jue','Vie','Sab'].map(d => (
            <div key={d} className="text-sm text-[var(--color-text-muted)] font-semibold p-2">{d}</div>
          ))}
          {monthDays.map((d) => {
            const isCurrentMonth = d.getMonth() === viewDate.getMonth();
            const dayKey = d.toDateString();
            const dayEvents = eventsByDay[dayKey] || [];
            return (
              <div key={dayKey} className={`min-h-28 rounded-md p-2 border ${isCurrentMonth ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'} border-[var(--color-border)]`}>
                <div className="flex justify-between items-start">
                  <div className="text-sm font-semibold">{d.getDate()}</div>
                  <GymButton size="xs" variant="ghost" onClick={() => openNew(d)}>Agendar</GymButton>
                </div>
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {dayEvents.map(ev => {
                    const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-[var(--color-success)]' : ev.event_type === 'reunion' ? 'border-l-4 border-[var(--color-teal)]' : ev.event_type === 'videollamada' ? 'border-l-4 border-[var(--color-gold)]' : 'border-l-4 border-[var(--color-amber)]';
                    const statusBg = ev.status === 'confirmada' ? 'bg-[var(--color-success)] text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-[var(--color-danger)] text-white' : 'bg-[var(--color-card-alt)] text-[var(--color-text)]';
                    return (
                      <button key={ev.id} onClick={() => openDetails(ev)} className={`w-full text-left rounded px-2 py-1 border ${typeColor} border-[var(--color-border)] ${statusBg} text-xs`}> 
                        <div className="flex justify-between items-center">
                          <div className="font-semibold truncate" title={ev.title}>{ev.title}</div>
                          <div className="text-[var(--color-text-muted)] ml-2">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </GymCard>
      
      <GymModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedEvent?.title || 'Detalle de Agenda'} width="md">
        {selectedEvent && (
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Tipo</p>
                <p className="font-semibold">{selectedEvent.event_type}</p>
              </div>
              <div className="relative" ref={optionsRef}>
                <GymButton size="sm" variant="ghost" onClick={() => setOptionsOpen(!optionsOpen)}>Opciones <IconDots className="inline ml-2" /></GymButton>
                {optionsOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded border border-[var(--color-border)] bg-[var(--color-card-alt)] p-2 z-50">
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => { setIsEditingEvent(true); setOptionsOpen(false); }}><IconCalendarTime size={18} />Reagendar</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'confirmada')}><IconCheck size={18} />Confirmar</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'ausente')}><IconUserX size={18} />Ausente</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'realizada')}><IconRefresh size={18} />Concretar</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'espera')}><IconClock size={18} />Espera</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 text-red-500 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'en_curso')}><IconCalendarEvent size={18} />En Curso</button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 text-red-500 hover:bg-[rgba(255,255,255,0.02)]" onClick={() => applyStatusChange(selectedEvent, 'cancelada')}><IconX size={18} />Cancelar</button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingEvent ? (
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-muted)]">Paciente</p>
                <p>{patients.find(p=>p.id===selectedEvent.patient_id)?.first_name || '—'} {patients.find(p=>p.id===selectedEvent.patient_id)?.last_name || ''}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Teléfono</p>
                <p>{selectedEvent.phone || '—'}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Fecha y Hora</p>
                <p>{new Date(selectedEvent.start_at).toLocaleString('es-MX')} — {selectedEvent.end_at ? new Date(selectedEvent.end_at).toLocaleString('es-MX') : '-'}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Estado</p>
                <p className="font-semibold">{selectedEvent.status}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Descripción</p>
                <p className="whitespace-pre-wrap">{selectedEvent.description || '—'}</p>
                <div className="pt-4 flex justify-end gap-3">
                  <GymButton variant="secondary" onClick={() => setDetailModalOpen(false)}>Cerrar</GymButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Inicio</label>
                  <input type="datetime-local" value={selectedEvent.start_at ? selectedEvent.start_at.slice(0,19) : ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, start_at: new Date(e.target.value).toISOString() })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Fin</label>
                  <input type="datetime-local" value={selectedEvent.end_at ? selectedEvent.end_at.slice(0,19) : ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, end_at: new Date(e.target.value).toISOString() })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <GymButton variant="secondary" onClick={() => setIsEditingEvent(false)}>Cancelar</GymButton>
                  <GymButton variant="primary" onClick={saveEventEdits}>Guardar</GymButton>
                </div>
              </div>
            )}
          </div>
        )}
      </GymModal>

      <GymModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={form.event_type === 'cita' ? 'Agendar Cita' : 'Nueva Agenda'} width="md">
        <div className="space-y-4 text-[var(--color-text)]">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Tipo</label>
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]">
              <option value="cita">Cita</option>
              <option value="reunion">Reunión</option>
              <option value="videollamada">Videollamada</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Título</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>

          {form.event_type === 'cita' && (
            <div>
              <label className="block text-sm text-[var(--color-text-muted)]">Paciente</label>
              <select value={form.patient_id || ''} onChange={(e) => setForm({ ...form, patient_id: e.target.value || null })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]">
                <option value="">Seleccionar paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.phone || 'Sin teléfono'}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Inicio</label>
            <input type="datetime-local" value={form.start_at ? form.start_at.slice(0,19) : ''} onChange={(e) => setForm({ ...form, start_at: new Date(e.target.value).toISOString() })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Fecha y Hora Fin</label>
            <input type="datetime-local" value={form.end_at ? form.end_at.slice(0,19) : ''} onChange={(e) => setForm({ ...form, end_at: new Date(e.target.value).toISOString() })} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-muted)]">Descripción / Razón</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 bg-[var(--color-card-alt)]" />
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
