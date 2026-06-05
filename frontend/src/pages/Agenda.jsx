import { useState, useMemo, useEffect, useRef } from 'react';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { useAgenda, useCreateAgenda, useUpdateAgenda } from '../hooks/useAgenda';
import { usePatients } from '../hooks/usePatients';
import { IconPlus, IconCalendarEvent, IconCalendarTime, IconCheck, IconUserX, IconRefresh, IconClock, IconX, IconDots } from '@tabler/icons-react';

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
    const iso = new Date(day).toISOString().slice(0,10);
    setForm((prev) => ({
      ...prev,
      start_at: `${iso}T09:00:00.000Z`,
      end_at: `${iso}T10:00:00.000Z`,
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
      const payload = {
        ...form,
        patient_id: form.patient_id || null,
        end_at: form.end_at || null,
        reminder_at: form.metadata.reminder_at || null,
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
          reminder_at: '',
        },
      });
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
        start_at: selectedEvent.start_at,
        end_at: selectedEvent.end_at,
        reminder_at: selectedEvent.metadata?.reminder_at || null,
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
    <div className="min-h-screen p-6 bg-(--color-surface)">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-(--color-text)">Agenda</h1>
          <p className="text-(--color-text-muted)">Calendario de actividades y citas</p>
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
            <div key={d} className="text-sm text-(--color-text-muted) font-semibold p-2">{d}</div>
          ))}
          {monthDays.map((d) => {
            const isCurrentMonth = d.getMonth() === viewDate.getMonth();
            const dayKey = d.toDateString();
            const dayEvents = eventsByDay[dayKey] || [];
            return (
              <div key={dayKey} className={`min-h-28 rounded-md p-2 border ${isCurrentMonth ? 'bg-(--color-card-alt)' : 'bg-(--color-card)'} border-(--color-border)`}>
                <div className="flex justify-between items-start">
                  <div className="text-sm font-semibold">{d.getDate()}</div>
                  <GymButton size="xs" variant="ghost" onClick={() => openNew(d)}>Agendar</GymButton>
                </div>
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {dayEvents.map(ev => {
                    const typeColor = ev.event_type === 'cita' ? 'border-l-4 border-(--color-success)' : ev.event_type === 'reunion' ? 'border-l-4 border-(--color-teal)' : ev.event_type === 'videollamada' ? 'border-l-4 border-(--color-gold)' : 'border-l-4 border-(--color-amber)';
                    const statusBg = ev.status === 'confirmada' ? 'bg-(--color-success) text-white' : ev.status === 'cancelada' || ev.status === 'ausente' ? 'bg-(--color-danger) text-white' : 'bg-(--color-card-alt) text-(--color-text)';
                    return (
                      <button key={ev.id} onClick={() => openDetails(ev)} className={`w-full text-left rounded px-2 py-1 border ${typeColor} border-(--color-border) ${statusBg} text-xs`}> 
                        <div className="flex justify-between items-center">
                          <div className="font-semibold truncate" title={ev.title}>{ev.title}</div>
                          <div className="text-(--color-text-muted) ml-2">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                  <label className="block text-sm text-(--color-text-muted)">Fecha y Hora Inicio</label>
                  <input type="datetime-local" value={selectedEvent.start_at ? selectedEvent.start_at.slice(0,19) : ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, start_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="w-full rounded border px-3 py-2 bg-(--color-card-alt)" />
                </div>
                <div>
                  <label className="block text-sm text-(--color-text-muted)">Fecha y Hora Fin</label>
                  <input type="datetime-local" value={selectedEvent.end_at ? selectedEvent.end_at.slice(0,19) : ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, end_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="w-full rounded border px-3 py-2 bg-(--color-card-alt)" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-(--color-text-muted)">Fecha y Hora Inicio</label>
              <input type="datetime-local" value={form.start_at ? form.start_at.slice(0,19) : ''} onChange={(e) => setForm({ ...form, start_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
            </div>
            <div>
              <label className="block text-sm text-(--color-text-muted)">Fecha y Hora Fin</label>
              <input type="datetime-local" value={form.end_at ? form.end_at.slice(0,19) : ''} onChange={(e) => setForm({ ...form, end_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-(--color-text-muted)">Notas adicionales</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
          </div>

          <div>
            <label className="block text-sm text-(--color-text-muted)">Recordatorio</label>
            <input type="datetime-local" value={form.metadata.reminder_at ? form.metadata.reminder_at.slice(0,19) : ''} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, reminder_at: e.target.value ? new Date(e.target.value).toISOString() : '' } })} className="w-full rounded-md border border-(--color-border) bg-(--color-card-alt) px-4 py-3 text-(--color-text)" />
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
