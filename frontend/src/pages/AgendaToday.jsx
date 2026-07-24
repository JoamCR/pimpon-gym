import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { SimpleDateInput } from '../components/ui/SimpleDateInput';
import { TodayAgendaList } from '../components/ui/TodayAgendaList';
import { useAgenda, useUpdateAgenda, useCreateAgenda } from '../hooks/useAgenda';
import { usePatients } from '../hooks/usePatients';
import { ScheduleAppointmentModal, TimePicker } from '../components/ui/ScheduleAppointmentModal';
import {
  IconCalendarEvent,
  IconCalendarTime,
  IconCheck,
  IconUserX,
  IconRefresh,
  IconClock,
  IconX,
  IconDots,
  IconPlus,
  IconStethoscope,
  IconSearch
} from '@tabler/icons-react';

export default function AgendaToday() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [initialFormState, setInitialFormState] = useState({
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

  const optionsRef = useRef();

  const { data, isLoading } = useAgenda({ search: searchQuery });
  const events = useMemo(() => data?.data || [], [data]);
  const { data: patientsResp } = usePatients();
  const patients = useMemo(() => patientsResp?.data || [], [patientsResp]);

  const createMutation = useCreateAgenda();
  const updateMutation = useUpdateAgenda();

  const selectedPatient = selectedEvent ? patients.find((p) => p.id === selectedEvent.patient_id) : null;

  const openNew = (day = selectedDate) => {
    const d = new Date(day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    setInitialFormState({
      event_type: 'cita',
      title: '',
      description: '',
      patient_id: null,
      phone: '',
      status: 'programada',
      start_at: `${yyyy}-${mm}-${dd}T09:00:00`,
      end_at: '',
      metadata: {
        reason: '',
        medium: '',
        with_whom: '',
        location: '',
        reminder_at: '',
      },
    });
    setModalOpen(true);
  };

  const handleSubmitNew = async (form) => {
    try {
      const payload = {
        ...form,
        patient_id: form.patient_id || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        reminder_at: form.metadata.reminder_at ? new Date(form.metadata.reminder_at).toISOString() : null,
      };

      await createMutation.mutateAsync(payload);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar evento');
    }
  };

  const openDetails = (ev) => {
    setSelectedEvent(ev);
    setDetailModalOpen(true);
    setIsEditingEvent(false);
  };

  const applyStatusChange = async (ev, newStatus) => {
    try {
      await updateMutation.mutateAsync({ id: ev.id, payload: { status: newStatus } });
      setSelectedEvent((s) => (s && s.id === ev.id ? { ...s, status: newStatus } : s));
      setOptionsOpen(false);
      if (newStatus === 'en_curso') {
        const patientId = ev.patient_id || (selectedEvent?.id === ev.id ? selectedEvent.patient_id : null);
        setDetailModalOpen(false);
        if (patientId) {
          navigate(`/patients/${patientId}?tab=consult`);
        }
      }
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

  const combineDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const timePart = timeStr ? timeStr.split('T')[1] || '00:00:00' : '00:00:00';
    return `${dateStr}T${timePart}`;
  };

  const splitDateTime = (dateTimeStr) => {
    if (!dateTimeStr || !dateTimeStr.includes('T')) return [dateTimeStr, ''];
    const [datePart, timePart] = dateTimeStr.split('T');
    return [datePart, timePart ? `${datePart}T${timePart}` : ''];
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[var(--color-surface)] space-y-6">
      {/* Encabezado Principal */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text)]">Agenda del Día</h1>
          <p className="text-[var(--color-text-muted)] text-sm sm:text-base">
            Listado y control de agendas del día seleccionado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GymButton onClick={() => openNew(selectedDate)} variant="primary">
            <IconPlus size={18} className="mr-1.5 inline" /> Nueva Cita
          </GymButton>
        </div>
      </header>

      {/* Buscador y Contenido */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por paciente, título, notas..."
            className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-gold)]"
          />
        </div>

        {/* Tarjeta con la Lista del Día */}
        <div className="w-full">
          <TodayAgendaList
            events={events}
            patients={patients}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onEventClick={openDetails}
            onStatusChange={applyStatusChange}
          />
        </div>
      </div>

      {/* Modal de Detalle de Cita */}
      <GymModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedEvent?.title || 'Detalle de Agenda'} width="lg">
        {selectedEvent && (
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Tipo</p>
                <p className="font-semibold capitalize">{selectedEvent.event_type}</p>
              </div>
              <div className="relative" ref={optionsRef}>
                <GymButton size="sm" variant="ghost" onClick={() => setOptionsOpen(!optionsOpen)}>
                  Opciones <IconDots className="inline ml-2" />
                </GymButton>
                {optionsOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded border border-[var(--color-border)] bg-[var(--color-card-alt)] p-2 z-50 shadow-lg">
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingEvent(true); setOptionsOpen(false); }}>
                      <IconCalendarTime size={16} /> Editar / Reagendar
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-[var(--color-success)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'confirmada'); }}>
                      <IconCheck size={16} /> Confirmar
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-[var(--color-danger)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'ausente'); }}>
                      <IconUserX size={16} /> Ausente
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-[var(--color-teal)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'realizada'); }}>
                      <IconRefresh size={16} /> Concretar
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-[var(--color-gold)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'espera'); }}>
                      <IconClock size={16} /> Espera
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-[var(--color-amber)]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'en_curso'); }}>
                      <IconCalendarEvent size={16} /> En Curso
                    </button>
                    <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 text-red-500" onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyStatusChange(selectedEvent, 'cancelada'); }}>
                      <IconX size={16} /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingEvent ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Paciente</p>
                    <p className="font-medium">{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Teléfono</p>
                    <p className="font-medium">{selectedEvent.phone || selectedPatient?.phone || '—'}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Fecha y Hora</p>
                    <p className="font-medium">{new Date(selectedEvent.start_at).toLocaleString('es-MX')} {selectedEvent.end_at ? `— ${new Date(selectedEvent.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Estado</p>
                    <p className="font-semibold uppercase text-xs tracking-wider">{selectedEvent.status}</p>
                  </div>
                </div>

                {selectedEvent.metadata?.reason && (
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Razón</p>
                    <p>{selectedEvent.metadata.reason}</p>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Notas</p>
                    <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center gap-3 border-t border-[var(--color-border)]">
                  {selectedPatient ? (
                    <GymButton
                      variant="primary"
                      onClick={() => {
                        setDetailModalOpen(false);
                        navigate(`/patients/${selectedPatient.id}?tab=consult`);
                      }}
                    >
                      <IconStethoscope size={18} className="mr-1.5 inline" /> Nueva Consulta
                    </GymButton>
                  ) : <div />}
                  <GymButton variant="secondary" onClick={() => setDetailModalOpen(false)}>Cerrar</GymButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)]">Título</label>
                  <input type="text" value={selectedEvent.title} onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-[var(--color-card-alt)] text-[var(--color-text)]" />
                </div>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">Fecha Inicio</label>
                      <SimpleDateInput
                        value={splitDateTime(getLocalDateTimeString(selectedEvent.start_at))[0]}
                        onChange={(date) => setSelectedEvent(prev => ({ ...prev, start_at: combineDateTime(date, prev.start_at) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">Hora Inicio</label>
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
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">Fecha Fin</label>
                      <SimpleDateInput
                        value={splitDateTime(getLocalDateTimeString(selectedEvent.end_at))[0]}
                        onChange={(date) => setSelectedEvent(prev => ({ ...prev, end_at: combineDateTime(date, prev.end_at) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1">Hora Fin</label>
                      <TimePicker
                        dateStr={getLocalDateTimeString(selectedEvent.end_at)}
                        onChange={(newVal) => setSelectedEvent(prev => ({ ...prev, end_at: newVal }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)]">Notas adicionales</label>
                  <textarea value={selectedEvent.description || ''} onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })} rows={3} className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-[var(--color-card-alt)] text-[var(--color-text)]" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                  <GymButton variant="secondary" onClick={() => setIsEditingEvent(false)}>Cancelar</GymButton>
                  <GymButton variant="primary" onClick={saveEventEdits}>Guardar</GymButton>
                </div>
              </div>
            )}
          </div>
        )}
      </GymModal>

      {/* Modal de Agendar Cita */}
      <ScheduleAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitNew}
        initialFormState={initialFormState}
        patients={patients}
      />
    </div>
  );
}
