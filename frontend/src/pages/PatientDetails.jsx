import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatients, useCreatePayment } from '../hooks/usePatients';
import { useClients } from '../hooks/useClients';
import { useEvaluationHistory, useCreateEvaluation } from '../hooks/useNutrition';
import { useCreateAgenda, useAgenda } from '../hooks/useAgenda';
import { GymCard } from '../components/ui/GymCard';
import { GymButton } from '../components/ui/GymButton';
import { ConsultForm } from '../components/ui/ConsultModal/ConsultModal';
import { IconArrowLeft, IconStethoscope, IconCoin, IconCalendar, IconFolder } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { AgendaCalendar } from '../components/ui/AgendaCalendar';
import { ScheduleAppointmentModal } from '../components/ui/ScheduleAppointmentModal';

export default function PatientDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');

  // Find patient by slug (first_name or id)
  const { data: patientsData, isLoading: isLoadingPatients } = usePatients();
  const { data: clientsData, isLoading: isLoadingClients } = useClients(); // ADDED
  
  const patients = Array.isArray(patientsData) ? patientsData : patientsData?.data || [];
  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.data || [];
  
  const patient = useMemo(() => {
    let found = patients.find(p => 
      p.first_name === slug || 
      `${p.id}` === slug || 
      `${p.first_name}-${p.last_name}`.replace(/\s+/g, '-') === slug
    );
    if (found) return { ...found, userType: 'patient' };
    
    found = clients.find(c => 
      c.first_name === slug || 
      `${c.id}` === slug || 
      `${c.first_name}-${c.last_name}`.replace(/\s+/g, '-') === slug
    );
    if (found) return { ...found, userType: 'client' };

    return null;
  }, [patients, clients, slug]);

  const { data: evaluationsData, isLoading: isLoadingEvaluations } = useEvaluationHistory(patient?.id);
  const evaluations = Array.isArray(evaluationsData?.data) ? evaluationsData.data : [];

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
  // Forms state
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', notes: '' });
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

  // Mutations
  const createEvaluationMutation = useCreateEvaluation();
  const createPaymentMutation = useCreatePayment();
  const createAgendaMutation = useCreateAgenda();

  // Agenda state and data
  const [viewDate, setViewDate] = useState(new Date());
  const { data: agendaData } = useAgenda();
  const events = useMemo(() => agendaData?.data || [], [agendaData]);

  const handleSaveConsult = async (payload) => {
    const isClient = patient.userType === 'client';
    const cleanedPayload = {
      ...payload,
      entity_type: isClient ? 'gym' : 'consultorio',
      [isClient ? 'client_id' : 'patient_id']: patient.id,
    };

    ['weight_kg', 'height_cm', 'body_fat_pct', 'visceral_fat_pct', 'muscle_mass_kg', 'waist_cm', 'caloric_target', 'protein_target_g', 'carbs_target_g', 'fat_target_g'].forEach((key) => {
      if (cleanedPayload[key]) cleanedPayload[key] = Number(cleanedPayload[key]);
      else delete cleanedPayload[key];
    });

    Object.keys(cleanedPayload).forEach((key) => {
      if (cleanedPayload[key] === '') delete cleanedPayload[key];
    });

    try {
      await createEvaluationMutation.mutateAsync(cleanedPayload);
      toast.success('Expediente registrado exitosamente');
      setActiveTab('history');
    } catch (error) {
      toast.error(error.message || 'Error al guardar el expediente');
      throw error;
    }
  };

  const handleSavePayment = () => {
    const isClient = patient.userType === 'client';
    const payload = {
      entity_type: isClient ? 'gym' : 'consultorio',
      [isClient ? 'client_id' : 'patient_id']: patient.id,
      amount: Number(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      payment_type: 'nutrition_consult',
      notes: paymentForm.notes
    };
    
    if (!payload.amount || payload.amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    createPaymentMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Pago de consulta registrado exitosamente');
        setActiveTab('details');
      },
      onError: (error) => {
        toast.error(error.message || 'Error al registrar el pago');
      }
    });
  };

  const handleSaveSchedule = async (form) => {
    try {
      const isClient = patient.userType === 'client';
      await createAgendaMutation.mutateAsync({
        ...form,
        [isClient ? 'client_id' : 'patient_id']: patient.id,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      });
      toast.success('Cita agendada exitosamente');
      setScheduleModalOpen(false);
    } catch (err) {
      if (err.status === 409) {
        toast.error('Este horario ya está ocupado. Por favor, elige otro.');
      } else {
        toast.error(err.message || 'Error al agendar cita');
      }
    }
  };

  const openNewAppointment = (day) => {
    const d = new Date(day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(new Date().getHours()).padStart(2, '0');
    const min = String(new Date().getMinutes()).padStart(2, '0');

    setInitialFormState({
        event_type: 'cita',
        title: `Cita — ${patient.first_name}`,
        description: '',
        patient_id: patient.id,
        phone: patient.phone,
        status: 'programada',
        start_at: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
        end_at: '',
        metadata: {
            reason: '',
            medium: '',
            with_whom: '',
            location: '',
            reminder_at: '',
        },
    });
    setScheduleModalOpen(true);
  };

  const openAppointmentDetails = (event) => {
      // For now, just log it. We can implement a detail view later.
      console.log('Event clicked:', event);
      toast.success(`Cita seleccionada: ${event.title}`);
  };

  const navigatePrev = () => {
    setViewDate(d => {
        const newDate = new Date(d);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
    });
  };

  const navigateNext = () => {
    setViewDate(d => {
        const newDate = new Date(d);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
    });
  };

  if (isLoadingPatients || isLoadingClients) {
    return <div className="min-h-screen p-6 flex items-center justify-center text-[var(--color-text)]">Cargando expediente...</div>;
  }

  if (!patient) {
    return (
      <div className="min-h-screen p-6 bg-[var(--color-surface)] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Paciente no encontrado</h2>
        <GymButton variant="secondary" onClick={() => navigate(-1)} icon={<IconArrowLeft />}>Volver</GymButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-3">
          <GymButton variant="secondary" onClick={() => navigate(-1)} icon={<IconArrowLeft size={18} />}>
            Volver
          </GymButton>
          <div>
            <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)] flex items-center gap-3">
              <IconFolder className="text-[var(--color-gold)]" size={36} />
              Expediente: {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-[var(--color-text-muted)] mt-2">Gestiona el historial y las consultas de este paciente.</p>
          </div>
        </div>
      </header>

      {/* Estilo de "Carpeta con Pestañas" */}
      <div className="mt-8">
        <div className="flex flex-wrap gap-1 pl-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 rounded-t-lg font-bold transition-colors ${
              activeTab === 'details' 
                ? 'bg-[var(--color-card)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-alt)] hover:text-[var(--color-text)] border-t border-l border-r border-transparent'
            }`}
          >
            Detalles del Paciente
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-t-lg font-bold transition-colors ${
              activeTab === 'history' 
                ? 'bg-[var(--color-card)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-alt)] hover:text-[var(--color-text)] border-t border-l border-r border-transparent'
            }`}
          >
            Historial de Consultas
          </button>
          <button
            onClick={() => setActiveTab('consult')}
            className="px-6 py-3 rounded-t-lg font-bold transition-colors bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-alt)] hover:text-[var(--color-text)] border-t border-l border-r border-transparent flex items-center gap-2"
          >
            <IconStethoscope size={18} />
            Nueva Consulta
          </button>
          <button
            onClick={() => {
              setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
              setActiveTab('payment');
            }}
            className={`px-6 py-3 rounded-t-lg font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'payment' 
                ? 'bg-[var(--color-card)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-alt)] hover:text-[var(--color-text)] border-t border-l border-r border-transparent'
            }`}
          >
            <IconCoin size={18} />
            Cobrar Consulta
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 rounded-t-lg font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'schedule' 
                ? 'bg-[var(--color-card)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-card-alt)] hover:text-[var(--color-text)] border-t border-l border-r border-transparent'
            }`}
          >
            <IconCalendar size={18} />
            Agendar Cita
          </button>
        </div>
        
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-b-xl rounded-tr-xl p-6 shadow-lg min-h-[50vh]">
          {activeTab === 'details' && (
            <div className="space-y-6 text-[var(--color-text)] animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 mb-4 text-[var(--color-gold)]">
                Información Personal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Nombre Completo</p>
                  <p className="text-lg">{patient.first_name} {patient.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Teléfono</p>
                  <p className="text-lg">{patient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Correo electrónico</p>
                  <p className="text-lg">{patient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Fecha de nacimiento</p>
                  <p className="text-lg">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Edad</p>
                  <p className="text-lg">{patient.age ? `${patient.age} años` : 'N/A'}</p>
                </div>
                {/* <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">RFC</p>
                  <p className="text-lg">{patient.rfc || 'No registrado'}</p>
                </div> */}
                {/* <div>
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Ocupación</p>
                  <p className="text-lg">{patient.occupation || 'No registrado'}</p>
                </div> */}
              </div>

              <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 mb-4 mt-8 text-[var(--color-gold)]">
                Evaluación Rápida
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Peso y Estatura</p>
                  <p className="text-md">Peso: <span className="font-bold">{patient.quick_weight_kg ? `${patient.quick_weight_kg} kg` : 'N/A'}</span></p>
                  <p className="text-md">Estatura: <span className="font-bold">{patient.quick_height_cm ? `${patient.quick_height_cm} cm` : 'N/A'}</span></p>
                </div>
                <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Objetivo</p>
                  <p className="text-md font-bold text-[var(--color-success)]">{patient.quick_goal || 'N/A'}</p>
                </div>
                <div className="md:col-span-2 bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1">Notas de salud</p>
                  <p className="text-md italic">{patient.quick_health_notes || 'Sin notas registradas.'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 mb-4 text-[var(--color-gold)]">
                Historial Médico y Nutricional
              </h2>
              {isLoadingEvaluations ? (
                <p className="text-[var(--color-text-muted)] text-center py-8">Cargando historial...</p>
              ) : evaluations.length > 0 ? (
                <div className="space-y-4">
                  {evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="p-5 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-4 border-b border-[var(--color-border)] pb-3">
                        <h3 className="font-bold text-lg text-[var(--color-text)] flex items-center gap-2">
                          <IconStethoscope className="text-[var(--color-success)]" />
                          Consulta del {new Date(evaluation.evaluation_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${evaluation.is_free_consult ? 'bg-[rgba(234,179,8,0.2)] text-yellow-500' : 'bg-[rgba(15,62,96,0.2)] text-[var(--color-secondary)]'}`}>
                          {evaluation.is_free_consult ? 'Consulta Gratuita' : 'Consulta Regular'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-[var(--color-text)]">
                        <div className="bg-[var(--color-card-alt)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                          <span className="block text-xs text-[var(--color-text-muted)] uppercase mb-1">Peso</span> 
                          <span className="font-bold text-lg">{evaluation.weight_kg || '—'} kg</span>
                        </div>
                        <div className="bg-[var(--color-card-alt)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                          <span className="block text-xs text-[var(--color-text-muted)] uppercase mb-1">% Grasa</span> 
                          <span className="font-bold text-lg">{evaluation.body_fat_pct || '—'}%</span>
                        </div>
                        <div className="bg-[var(--color-card-alt)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                          <span className="block text-xs text-[var(--color-text-muted)] uppercase mb-1">Masa Muscular</span> 
                          <span className="font-bold text-lg">{evaluation.muscle_mass_kg || '—'} kg</span>
                        </div>
                        <div className="bg-[var(--color-card-alt)] p-3 rounded-lg border border-[var(--color-border)] text-center">
                          <span className="block text-xs text-[var(--color-text-muted)] uppercase mb-1">IMC</span> 
                          <span className="font-bold text-lg">
                            {evaluation.height_cm && evaluation.weight_kg ? (evaluation.weight_kg / ((evaluation.height_cm / 100) ** 2)).toFixed(1) : '—'}
                          </span>
                        </div>
                      </div>
                      
                      {/* More details if needed could be expanded here */}
                      {(evaluation.notes || evaluation.caloric_target) && (
                        <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-border)]">
                          {evaluation.caloric_target && (
                            <p className="text-sm text-[var(--color-text)]"><span className="font-semibold text-[var(--color-text-muted)]">Meta Calórica:</span> {evaluation.caloric_target} kcal</p>
                          )}
                          {evaluation.notes && (
                            <p className="text-sm text-[var(--color-text)] mt-2"><span className="font-semibold text-[var(--color-text-muted)]">Notas:</span> {evaluation.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                  <IconFolder className="mx-auto text-[var(--color-border)] mb-3" size={48} />
                  <p className="text-lg font-semibold text-[var(--color-text-muted)]">El expediente está vacío</p>
                  <p className="text-sm text-[var(--color-text-muted)]">El paciente no tiene consultas registradas.</p>
                  <GymButton variant="primary" className="mt-4" onClick={() => setActiveTab('consult')}>
                    Iniciar Primera Consulta
                  </GymButton>
                </div>
              )}
            </div>
          )}
          {activeTab === 'payment' && (
            <div className="space-y-6 text-[var(--color-text)] animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 mb-4 text-[var(--color-gold)]">
                Cobrar Consulta
              </h2>
              <div className="max-w-md space-y-4 bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Monto ($)</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    placeholder="Ej. 500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Método de Pago</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    {/* <option value="card">Tarjeta</option> */}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas (opcional)</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    placeholder="Detalles del pago"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                  <GymButton variant="secondary" onClick={() => setActiveTab('details')}>Cancelar</GymButton>
                  <GymButton variant="success" onClick={handleSavePayment}>Registrar Pago</GymButton>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consult' && (
            <div className="space-y-6 text-[var(--color-text)] animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 mb-4 text-[var(--color-gold)]">
                Nueva Consulta
              </h2>
              <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
                <ConsultForm
                  patient={patient}
                  onSubmit={handleSaveConsult}
                  onCancel={() => setActiveTab('history')}
                  submitLabel="Guardar Expediente"
                />
              </div>
            </div>
          )}
          {activeTab === 'schedule' && (
             <div className="space-y-6 text-[var(--color-text)] animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[var(--color-gold)]">
                        Calendario de Citas — {viewDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                        <GymButton onClick={navigatePrev} variant="secondary">Anterior</GymButton>
                        <GymButton onClick={() => setViewDate(new Date())} variant="ghost">Hoy</GymButton>
                        <GymButton onClick={navigateNext} variant="primary">Siguiente</GymButton>
                    </div>
                </div>
                <AgendaCalendar 
                    viewDate={viewDate}
                    events={events}
                    onDayClick={openNewAppointment}
                    onEventClick={openAppointmentDetails}
                />
             </div>
          )}
        </div>
      </div>

      <ScheduleAppointmentModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSubmit={handleSaveSchedule}
        initialFormState={initialFormState}
        patients={[patient].filter(Boolean)}
      />
    </div>
  );
}
