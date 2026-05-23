import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { usePatients, useCreatePatient, useCreatePayment } from '../hooks/usePatients';
import { useEvaluationHistory, useCreateEvaluation } from '../hooks/useNutrition';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { IconChevronUp, IconChevronDown, IconSelector, IconPlus, IconEye, IconChevronRight, IconCoin, IconStethoscope } from '@tabler/icons-react';

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewPatientModal, setViewPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedConsultation, setExpandedConsultation] = useState(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    email: '',
    rfc: '',
    occupation: '',
    referred_by: '',
    quick_weight_kg: '',
    quick_height_cm: '',
    quick_goal: '',
    quick_health_notes: ''
  });

  const { data, isLoading } = usePatients({ search: searchQuery });
  const patients = Array.isArray(data) ? data : data?.data || [];
  const createPatientMutation = useCreatePatient();
  const createEvaluationMutation = useCreateEvaluation();
  const createPaymentMutation = useCreatePayment();
  
  const { data: evaluationsData, isLoading: isLoadingEvaluations } = useEvaluationHistory(selectedPatient?.id);
  const evaluations = Array.isArray(evaluationsData?.data) ? evaluationsData.data : [];

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', notes: '' });

  const handleOpenPayment = (patient) => {
    setSelectedPatient(patient);
    setPaymentForm({ amount: '', payment_method: 'cash', notes: '' });
    setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    const payload = {
      entity_type: 'consultorio',
      patient_id: selectedPatient.id,
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
        setPaymentModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Error al registrar el pago');
      }
    });
  };

  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [evaluationTab, setEvaluationTab] = useState('composition');
  const resetEvaluationForm = () => ({
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
    visceral_fat_pct: '',
    muscle_mass_kg: '',
    waist_cm: '',
    family_history: '',
    pathological_history: '',
    personal_history: '',
    body_composition_notes: '',
    diet_plan: '',
    caloric_target: '',
    protein_target_g: '',
    carbs_target_g: '',
    fat_target_g: '',
  });
  const [evaluationForm, setEvaluationForm] = useState(resetEvaluationForm());

  const handleOpenConsult = (patient) => {
    setSelectedPatient(patient);
    setEvaluationForm(resetEvaluationForm());
    setEvaluationTab('composition');
    setConsultModalOpen(true);
  };

  const handleSaveConsult = () => {
    const payload = {
      ...evaluationForm,
      patient_id: selectedPatient.id,
      entity_type: 'consultorio'
    };

    ['weight_kg', 'height_cm', 'body_fat_pct', 'visceral_fat_pct', 'muscle_mass_kg', 'waist_cm', 'caloric_target', 'protein_target_g', 'carbs_target_g', 'fat_target_g'].forEach(key => {
      if (payload[key]) payload[key] = Number(payload[key]);
      else delete payload[key];
    });

    Object.keys(payload).forEach(key => {
      if (payload[key] === '') delete payload[key];
    });

    createEvaluationMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Expediente registrado exitosamente');
        setConsultModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Error al guardar el expediente');
      }
    });
  };

  const openModal = () => {
    setStep(1);
    setFormData({
      first_name: '',
      last_name: '',
      age: '',
      phone: '',
      email: '',
      rfc: '',
      occupation: '',
      referred_by: '',
      quick_weight_kg: '',
      quick_height_cm: '',
      quick_goal: '',
      quick_health_notes: ''
    });
    setIsModalOpen(true);
  };

  const nextStep = () => {
    if (step === 3) {
      return submitForm();
    }
    setStep(step + 1);
  };

  const submitForm = () => {
    const payload = {
      ...formData,
      age: Number(formData.age),
    };
    
    // Sanitize empty strings
    if (!payload.email) delete payload.email;
    if (!payload.rfc) delete payload.rfc;
    if (!payload.occupation) delete payload.occupation;
    if (!payload.referred_by) delete payload.referred_by;
    if (!payload.quick_goal) delete payload.quick_goal;
    if (!payload.quick_health_notes) delete payload.quick_health_notes;
    
    if (payload.quick_weight_kg) payload.quick_weight_kg = Number(payload.quick_weight_kg);
    else delete payload.quick_weight_kg;

    if (payload.quick_height_cm) payload.quick_height_cm = Number(payload.quick_height_cm);
    else delete payload.quick_height_cm;

    createPatientMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Paciente registrado exitosamente');
        setIsModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Error al registrar el paciente');
      },
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPatients = useMemo(() => {
    let sortableItems = [...patients];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'patientName') {
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [patients, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <IconChevronUp size={16} className="inline" /> : <IconChevronDown size={16} className="inline" />;
    }
    return <IconSelector size={16} className="inline" />;
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setViewPatientModal(true);
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', key: 'first_name' },
            { label: 'Apellidos', key: 'last_name' },
            { label: 'Edad', key: 'age', type: 'number' },
            { label: 'Teléfono', key: 'phone' },
            { label: 'RFC', key: 'rfc' },
            { label: 'Email', key: 'email', type: 'email' },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
          ))}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Ocupación', key: 'occupation' },
            { label: 'Referido por', key: 'referred_by' },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Peso (kg) - Opcional</label>
            <input
              type="number"
              value={formData.quick_weight_kg}
              onChange={(e) => setFormData({ ...formData, quick_weight_kg: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Estatura (cm) - Opcional</label>
            <input
              type="number"
              value={formData.quick_height_cm}
              onChange={(e) => setFormData({ ...formData, quick_height_cm: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>
        </div>
        {[
          { label: 'Notas de salud (Evaluación rápida)', key: 'quick_health_notes', textarea: true },
          { label: 'Objetivo principal', key: 'quick_goal', textarea: true },
        ].map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
            {field.textarea ? (
              <textarea
                rows={3}
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            ) : (
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(22,163,74,0.12)] px-4 py-2 text-sm font-semibold text-[var(--color-success)]">Consultorio</div>
          <div>
            <h1 className="text-4xl font-[var(--font-display)] font-bold text-[var(--color-text)]">Administración de Pacientes</h1>
            <p className="text-[var(--color-text-muted)] mt-2">Gestiona el padrón de pacientes exclusivos del consultorio nutricional.</p>
          </div>
        </div>
        <GymButton icon={<IconPlus size={18} />} variant="primary" onClick={openModal}>Agregar Paciente</GymButton>
      </header>

      <GymCard title="Pacientes registrados" variant="default">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente..."
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
            />
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('patientName')}>
                    Paciente {getSortIcon('patientName')}
                  </th>
                  <th className="px-4 py-4">Teléfono</th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleSort('created_at')}>
                    Fecha Alta {getSortIcon('created_at')}
                  </th>
                  <th className="px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   <tr>
                     <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Cargando pacientes...</td>
                   </tr>
                ) : sortedPatients.map((patient, index) => (
                  <tr key={patient.id} className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-success)] text-white font-bold">{patient.first_name?.[0]}{patient.last_name?.[0]}</div>
                        <div>
                          <p className="font-semibold text-[var(--color-text)]">{patient.first_name} {patient.last_name}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{patient.email || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text-muted)]">{patient.phone}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-text)]">{new Date(patient.created_at).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-4 space-x-2">
                      <GymButton size="xs" variant="secondary" icon={<IconEye size={16} />} onClick={() => handleViewPatient(patient)}>Ver</GymButton>
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedPatients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No se encontraron pacientes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GymCard>

      <GymModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Paciente" width="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Paso {step} de 3</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${(step / 3) * 100}%` }} />
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">{step === 1 ? 'Datos personales' : step === 2 ? 'Datos adicionales' : 'Evaluación rápida'}</p>
          </div>

          {renderStep()}

          <div className="flex justify-between gap-3">
            <GymButton variant="secondary" onClick={() => setStep(Math.max(step - 1, 1))} disabled={step === 1}>Atrás</GymButton>
            <GymButton variant="primary" onClick={nextStep}>
              {step < 3 ? 'Siguiente' : 'Registrar paciente'}
            </GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={viewPatientModal} onClose={() => setViewPatientModal(false)} title="Detalles del Paciente" width="md">
        {selectedPatient && (
          <div className="space-y-4 text-[var(--color-text)]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Nombre Completo</p>
                <p>{selectedPatient.first_name} {selectedPatient.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Teléfono</p>
                <p>{selectedPatient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">RFC</p>
                <p>{selectedPatient.rfc || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Ocupación</p>
                <p>{selectedPatient.occupation || 'No registrado'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-[var(--color-text-muted)] font-semibold">Evaluación Rápida</p>
                <p className="text-sm">Peso: {selectedPatient.quick_weight_kg ? `${selectedPatient.quick_weight_kg} kg` : 'N/A'}</p>
                <p className="text-sm">Estatura: {selectedPatient.quick_height_cm ? `${selectedPatient.quick_height_cm} cm` : 'N/A'}</p>
                <p className="text-sm">Objetivo: {selectedPatient.quick_goal || 'N/A'}</p>
                <p className="text-sm">Notas de salud: {selectedPatient.quick_health_notes || 'N/A'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] mt-4">
              <h3 className="text-lg font-bold mb-3 text-[var(--color-text)]">Historial de Consultas</h3>
              {isLoadingEvaluations ? (
                <p className="text-sm text-[var(--color-text-muted)]">Cargando consultas...</p>
              ) : evaluations.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {evaluations.map((evalRecord) => {
                    const isExpanded = expandedConsultation === evalRecord.id;
                    return (
                      <div key={evalRecord.id} className="bg-[var(--color-card-alt)] rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden transition-all duration-200">
                        <button
                          className="w-full p-3 flex justify-between items-center text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                          onClick={() => setExpandedConsultation(isExpanded ? null : evalRecord.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[var(--color-text-muted)]">{isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}</span>
                            <span className="font-semibold text-[var(--color-success)]">
                              Expediente - {new Date(evalRecord.evaluation_date).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.1)] text-[var(--color-text-muted)]">
                            {evalRecord.is_free_consult ? 'Primera Gratis' : 'Consulta Pago'}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 border-t border-[var(--color-border)] bg-[rgba(0,0,0,0.1)]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 text-sm">
                              <div>
                                <p className="text-[var(--color-text-muted)] font-semibold mb-1">Composición Corporal</p>
                                <p>Peso: {evalRecord.weight_kg ? `${evalRecord.weight_kg} kg` : '-'}</p>
                                <p>Estatura: {evalRecord.height_cm ? `${evalRecord.height_cm} cm` : '-'}</p>
                                <p>Cintura: {evalRecord.waist_cm ? `${evalRecord.waist_cm} cm` : '-'}</p>
                              </div>
                              <div>
                                <p className="text-[var(--color-text-muted)] font-semibold mb-1">Masa y Grasa</p>
                                <p>% Grasa: {evalRecord.body_fat_pct ? `${evalRecord.body_fat_pct}%` : '-'}</p>
                                <p>Grasa Visceral: {evalRecord.visceral_fat_pct ? `${evalRecord.visceral_fat_pct}%` : '-'}</p>
                                <p>Músculo: {evalRecord.muscle_mass_kg ? `${evalRecord.muscle_mass_kg} kg` : '-'}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] text-sm">
                              {evalRecord.family_history && (
                                <div>
                                  <p className="text-[var(--color-text-muted)] font-semibold">Antecedentes Familiares</p>
                                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{evalRecord.family_history}</p>
                                </div>
                              )}
                              {evalRecord.pathological_history && (
                                <div>
                                  <p className="text-[var(--color-text-muted)] font-semibold">Antecedentes Patológicos</p>
                                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{evalRecord.pathological_history}</p>
                                </div>
                              )}
                              {evalRecord.personal_history && (
                                <div>
                                  <p className="text-[var(--color-text-muted)] font-semibold">Antecedentes Personales</p>
                                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{evalRecord.personal_history}</p>
                                </div>
                              )}
                              {evalRecord.body_composition_notes && (
                                <div>
                                  <p className="text-[var(--color-text-muted)] font-semibold">Notas de Consulta</p>
                                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{evalRecord.body_composition_notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">El paciente no tiene consultas registradas.</p>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <div className="flex gap-3">
                <GymButton variant="primary" icon={<IconStethoscope size={18} />} onClick={() => { setViewPatientModal(false); handleOpenConsult(selectedPatient); }}>Nueva Consulta</GymButton>
                <GymButton variant="success" icon={<IconCoin size={18} />} onClick={() => { setViewPatientModal(false); handleOpenPayment(selectedPatient); }}>Pago de Consulta</GymButton>
              </div>
              <GymButton variant="secondary" onClick={() => setViewPatientModal(false)}>Cerrar</GymButton>
            </div>
          </div>
        )}
      </GymModal>

      <GymModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Pago de Consulta — ${selectedPatient?.first_name || 'Paciente'}`} width="sm">
        <div className="space-y-4 text-[var(--color-text)]">
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
              <option value="card">Tarjeta</option>
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
            <GymButton variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancelar</GymButton>
            <GymButton variant="success" onClick={handleSavePayment}>Registrar Pago</GymButton>
          </div>
        </div>
      </GymModal>

      <GymModal isOpen={consultModalOpen} onClose={() => setConsultModalOpen(false)} title={`Nueva Consulta — ${selectedPatient?.first_name || 'Paciente'}`} width="lg">
        <div className="space-y-6">
          <div className="flex border-b border-[var(--color-border)] mb-4">
            <button
              className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'composition' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
              onClick={() => setEvaluationTab('composition')}
            >
              Composición Corporal
            </button>
            <button
              className={`px-4 py-2 font-semibold text-sm ${evaluationTab === 'diet' ? 'border-b-2 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}`}
              onClick={() => setEvaluationTab('diet')}
            >
              Plan Nutricional
            </button>
          </div>

          {evaluationTab === 'composition' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Peso (kg)', key: 'weight_kg' },
                  { label: 'Altura (cm)', key: 'height_cm' },
                  { label: 'Grasa (%)', key: 'body_fat_pct' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Visceral (%)', key: 'visceral_fat_pct' },
                  { label: 'Masa muscular (kg)', key: 'muscle_mass_kg' },
                  { label: 'Cintura (cm)', key: 'waist_cm' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Antecedentes personales</label>
                  <textarea
                    rows={3}
                    value={evaluationForm.personal_history}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, personal_history: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Notas de composición / Consulta</label>
                  <textarea
                    rows={3}
                    value={evaluationForm.body_composition_notes}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, body_composition_notes: e.target.value })}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>
          )}

          {evaluationTab === 'diet' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Calorías (kcal)', key: 'caloric_target' },
                  { label: 'Proteína (g)', key: 'protein_target_g' },
                  { label: 'Carbos (g)', key: 'carbs_target_g' },
                  { label: 'Grasa (g)', key: 'fat_target_g' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                    <input
                      type="number"
                      value={evaluationForm[field.key]}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, [field.key]: e.target.value })}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-muted)]">Plan de Alimentación / Dieta</label>
                <textarea
                  rows={8}
                  placeholder="Ej: Desayuno: 2 huevos, Comida: 150g pollo..."
                  value={evaluationForm.diet_plan}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, diet_plan: e.target.value })}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)]"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
            <GymButton variant="secondary" onClick={() => setConsultModalOpen(false)}>Cancelar</GymButton>
            <GymButton variant="success" onClick={handleSaveConsult}>Guardar Expediente</GymButton>
          </div>
        </div>
      </GymModal>
    </div>
  );
}